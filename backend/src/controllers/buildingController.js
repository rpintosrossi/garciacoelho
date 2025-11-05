const prisma = require('../lib/prisma');

// Obtener todos los edificios
const getBuildings = async (req, res) => {
  try {
    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    // Construir filtro de búsqueda
    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cuit: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Contar total de edificios
    const total = await prisma.building.count({ where: whereClause });

    // Obtener edificios con paginación, administrador y cuenta en una sola consulta
    const buildings = await prisma.building.findMany({
      include: {
        administrator: true,
        account: true
      },
      skip,
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });

    // Obtener todos los servicios, facturas y remitos en consultas separadas optimizadas
    const allServices = await prisma.service.findMany({
      where: {
        buildingId: { in: buildings.map(b => b.id) }
      },
      include: {
        invoice: true,
        remitos: true
      }
    });

    // Obtener todos los payment documents en una sola consulta
    const invoiceIds = allServices.map(s => s.invoice?.id).filter(Boolean);
    const remitoIds = allServices.flatMap(s => s.remitos.map(r => r.id));
    
    const allPaymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0) 
      ? await prisma.paymentDocument.findMany({
          where: {
            OR: [
              ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
              ...(remitoIds.length > 0 ? [{ remitoId: { in: remitoIds } }] : [])
            ]
          },
          include: { payment: true }
        })
      : [];

    // Crear mapas para acceso rápido
    const servicesByBuilding = allServices.reduce((acc, service) => {
      if (!acc[service.buildingId]) acc[service.buildingId] = [];
      acc[service.buildingId].push(service);
      return acc;
    }, {});

    const paymentDocsByInvoice = allPaymentDocs.reduce((acc, pd) => {
      if (pd.invoiceId) {
        if (!acc[pd.invoiceId]) acc[pd.invoiceId] = [];
        acc[pd.invoiceId].push(pd);
      }
      return acc;
    }, {});

    const paymentDocsByRemito = allPaymentDocs.reduce((acc, pd) => {
      if (pd.remitoId) {
        if (!acc[pd.remitoId]) acc[pd.remitoId] = [];
        acc[pd.remitoId].push(pd);
      }
      return acc;
    }, {});

    // Calcular saldos para cada edificio
    const buildingsWithBalance = await Promise.all(buildings.map(async (building) => {
      const buildingServices = servicesByBuilding[building.id] || [];
      const invoices = buildingServices.map(s => s.invoice).filter(Boolean);
      const remitos = buildingServices.flatMap(s => s.remitos);

      // Calcular saldo usando la misma lógica que la cuenta corriente
      let saldo = 0;
      
      // Sumar todas las facturas (como en la cuenta corriente)
      for (const inv of invoices) {
        saldo += inv.amount;
      }
      
      // Restar todos los pagos aplicados (usando el monto específico de cada documento)
      let totalDescuentos = 0;
      for (const inv of invoices) {
        const paymentDocs = paymentDocsByInvoice[inv.id] || [];
        for (const pd of paymentDocs) {
          // Usar pd.amount que es el monto aplicado a esta factura específica
          saldo -= pd.amount;
          // Restar también los descuentos
          if (pd.payment?.discount) {
            totalDescuentos += pd.payment.discount;
            saldo -= pd.payment.discount;
          }
        }
      }

      // DEBUG: Agregar logs para identificar la discrepancia
      console.log(`🔍 [DEBUG] Edificio ${building.name} (${building.id}):`);
      console.log(`  - Facturas: ${invoices.length}, Total: ${invoices.reduce((sum, inv) => sum + inv.amount, 0)}`);
      console.log(`  - Remitos: ${remitos.length}, Total: ${remitos.reduce((sum, rem) => sum + rem.amount, 0)} (NO incluidos en saldo)`);
      
      let totalPagos = 0;
      let facturasEfectivo = 0;
      for (const inv of invoices) {
        if (inv.paymentMethod === 'EFECTIVO') {
          facturasEfectivo++;
          console.log(`  - Factura en efectivo: ${inv.id}, monto: ${inv.amount}`);
        }
        const paymentDocs = paymentDocsByInvoice[inv.id] || [];
        for (const pd of paymentDocs) {
          // Usar pd.amount que es el monto aplicado a esta factura
          totalPagos += pd.amount;
        }
      }
      console.log(`  - Facturas en efectivo: ${facturasEfectivo}`);
      console.log(`  - Pagos totales aplicados: ${totalPagos}`);
      console.log(`  - Descuentos totales: ${totalDescuentos}`);
      console.log(`  - Saldo calculado: ${saldo}`);

      // Actualizar el saldo en la cuenta solo si es diferente
      if (building.account && Math.abs(building.account.balance - saldo) > 0.01) {
        await prisma.account.update({
          where: { buildingId: building.id },
          data: { balance: saldo }
        });
      }

      return {
        ...building,
        account: {
          ...building.account,
          balance: saldo
        }
      };
    }));

    res.json({
      buildings: buildingsWithBalance,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener edificios:', error);
    res.status(500).json({ message: 'Error al obtener edificios' });
  }
};

// Obtener un edificio por ID
const getBuildingById = async (req, res) => {
  try {
    const { id } = req.params;
    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        administrator: true,
        account: true
      }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    res.json(building);
  } catch (error) {
    console.error('Error al obtener edificio:', error);
    res.status(500).json({ message: 'Error al obtener edificio' });
  }
};

// Crear un nuevo edificio
const createBuilding = async (req, res) => {
  try {
    const { 
      name, 
      address, 
      cuit, 
      contact, 
      taxCondition, 
      administratorId,
      debtThreshold,
      rating,
      managerPhone,
      generalInfo,
      doormanType,
      floors,
      apartments,
      phones,
      phoneNames,
      locality
    } = req.body;

    // Verificar que el administrador existe
    const administrator = await prisma.administrator.findUnique({
      where: { id: administratorId }
    });

    if (!administrator) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    const existingBuilding = await prisma.building.findFirst({
      where: {
        OR: [
          { cuit }
        ]
      }
    });

    if (existingBuilding) {
      return res.status(400).json({ message: 'El CUIT ya está registrado' });
    }

    const building = await prisma.building.create({
      data: {
        name,
        address,
        cuit,
        contact,
        taxCondition,
        administratorId,
        debtThreshold: debtThreshold || 30,
        rating: rating || 1,
        managerPhone,
        generalInfo,
        doormanType,
        floors,
        apartments,
        phones: phones || [],
        phoneNames: phoneNames || [],
        locality,
        account: {
          create: {
            balance: 0
          }
        }
      },
      include: {
        administrator: true,
        account: true
      }
    });

    res.status(201).json(building);
  } catch (error) {
    console.error('Error al crear edificio:', error);
    res.status(500).json({ message: 'Error al crear edificio' });
  }
};

// Actualizar un edificio
const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      address, 
      cuit, 
      contact, 
      taxCondition, 
      administratorId,
      debtThreshold,
      rating,
      managerPhone,
      generalInfo,
      doormanType,
      floors,
      apartments,
      phones,
      phoneNames,
      locality
    } = req.body;

    // Verificar que el administrador existe si se está cambiando
    if (administratorId) {
      const administrator = await prisma.administrator.findUnique({
        where: { id: administratorId }
      });

      if (!administrator) {
        return res.status(404).json({ message: 'Administrador no encontrado' });
      }
    }

    const existingBuilding = await prisma.building.findFirst({
      where: {
        OR: [
          { cuit }
        ],
        NOT: {
          id
        }
      }
    });

    if (existingBuilding) {
      return res.status(400).json({ message: 'El CUIT ya está registrado' });
    }

    const building = await prisma.building.update({
      where: { id },
      data: {
        name,
        address,
        cuit,
        contact,
        taxCondition,
        administratorId,
        debtThreshold,
        rating,
        managerPhone,
        generalInfo,
        doormanType,
        floors,
        apartments,
        phones,
        phoneNames,
        locality
      },
      include: {
        administrator: true,
        account: true
      }
    });

    res.json(building);
  } catch (error) {
    console.error('Error al actualizar edificio:', error);
    res.status(500).json({ message: 'Error al actualizar edificio' });
  }
};

// Eliminar un edificio
const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ [BUILDINGS] Iniciando eliminación de edificio: ${id}`);

    // Obtener todos los servicios del edificio
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        invoice: {
          include: {
            paymentDocuments: true
          }
        },
        remitos: {
          include: {
            paymentDocuments: true
          }
        }
      }
    });

    console.log(`🗑️ [BUILDINGS] Edificio tiene ${services.length} servicios asociados`);

    // Eliminar en orden correcto (de dependencias a principales)
    for (const service of services) {
      console.log(`🗑️ [BUILDINGS] Procesando servicio: ${service.id}`);

      // 1. Eliminar PaymentDocuments de la factura
      if (service.invoice) {
        const invoicePaymentDocs = service.invoice.paymentDocuments || [];
        if (invoicePaymentDocs.length > 0) {
          console.log(`🗑️ [BUILDINGS] Eliminando ${invoicePaymentDocs.length} documentos de pago de factura`);
          await prisma.paymentDocument.deleteMany({
            where: {
              invoiceId: service.invoice.id
            }
          });
        }

        // 2. Eliminar la factura
        console.log(`🗑️ [BUILDINGS] Eliminando factura: ${service.invoice.id}`);
        await prisma.invoice.delete({
          where: { id: service.invoice.id }
        });
      }

      // 3. Eliminar PaymentDocuments de remitos
      for (const remito of service.remitos) {
        const remitoPaymentDocs = remito.paymentDocuments || [];
        if (remitoPaymentDocs.length > 0) {
          console.log(`🗑️ [BUILDINGS] Eliminando ${remitoPaymentDocs.length} documentos de pago de remito`);
          await prisma.paymentDocument.deleteMany({
            where: {
              remitoId: remito.id
            }
          });
        }

        // 4. Eliminar el remito
        console.log(`🗑️ [BUILDINGS] Eliminando remito: ${remito.id}`);
        await prisma.remito.delete({
          where: { id: remito.id }
        });
      }

      // 5. Eliminar el servicio
      console.log(`🗑️ [BUILDINGS] Eliminando servicio: ${service.id}`);
      await prisma.service.delete({
        where: { id: service.id }
      });
    }

    // 6. Eliminar pagos asociados al edificio (si los hay)
    const payments = await prisma.payment.findMany({
      where: {
        documents: {
          some: {
            OR: [
              {
                invoice: {
                  service: {
                    buildingId: id
                  }
                }
              },
              {
                remito: {
                  service: {
                    buildingId: id
                  }
                }
              }
            ]
          }
        }
      }
    });

    if (payments.length > 0) {
      console.log(`🗑️ [BUILDINGS] Eliminando ${payments.length} pagos asociados`);
      for (const payment of payments) {
        await prisma.payment.delete({
          where: { id: payment.id }
        });
      }
    }

    // 7. Eliminar la cuenta corriente del edificio (Account)
    const account = await prisma.account.findUnique({
      where: { buildingId: id }
    });

    if (account) {
      console.log(`🗑️ [BUILDINGS] Eliminando cuenta corriente: ${account.id}`);
      await prisma.account.delete({
        where: { id: account.id }
      });
    }

    // 8. Finalmente eliminar el edificio
    console.log(`🗑️ [BUILDINGS] Eliminando edificio: ${id}`);
    await prisma.building.delete({
      where: { id }
    });

    console.log(`✅ [BUILDINGS] Edificio eliminado correctamente con todos sus datos asociados`);
    res.json({ message: 'Edificio eliminado correctamente junto con todos sus datos asociados' });
  } catch (error) {
    console.error('❌ [BUILDINGS] Error al eliminar edificio:', error);
    res.status(500).json({ 
      message: 'Error al eliminar edificio',
      error: error.message 
    });
  }
};

// Cuenta corriente detallada de un edificio
const getBuildingAccount = async (req, res) => {
  try {
    const { id } = req.params;
    // Buscar todas las facturas de los servicios de este edificio
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        invoice: {
          include: {
            paymentDocuments: {
              include: {
                payment: true
              }
            }
          }
        }
      }
    });

    // Armar la lista de facturas y pagos
    let accountDetails = [];
    let saldoAFavor = 0;

    for (const service of services) {
      if (service.invoice) {
        const paymentDocuments = service.invoice.paymentDocuments || [];
        const totalPagado = paymentDocuments.reduce((sum, pd) => sum + pd.amount, 0);
        const saldoFactura = service.invoice.amount - totalPagado;
        // Si pagó de más, sumar al saldo a favor
        if (saldoFactura < 0) {
          saldoAFavor += Math.abs(saldoFactura);
        }
        accountDetails.push({
          factura: {
            id: service.invoice.id,
            serviceId: service.id,
            amount: service.invoice.amount,
            status: service.invoice.status,
            createdAt: service.invoice.createdAt,
            updatedAt: service.invoice.updatedAt
          },
          pagos: paymentDocuments.map(pd => ({
            id: pd.payment.id,
            amount: pd.amount,
            originalAmount: pd.payment.originalAmount,
            discount: pd.payment.discount,
            discountReason: pd.payment.discountReason,
            date: pd.payment.date,
            method: pd.payment.method,
            createdAt: pd.payment.createdAt,
            hasDiscount: pd.payment.discount > 0
          })),
          saldoFactura: saldoFactura
        });
      }
    }

    res.json({
      buildingId: id,
      facturas: accountDetails,
      saldoAFavor
    });
  } catch (error) {
    console.error('Error al obtener cuenta corriente del edificio:', error);
    res.status(500).json({ message: 'Error al obtener cuenta corriente del edificio' });
  }
};

// Utilidad para formatear moneda
function formatCurrency(amount) {
  return amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
}

// Movimientos de cuenta corriente del edificio
const getBuildingAccountMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, from, to } = req.query;
    // Obtener servicios del edificio
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        invoice: true,
        remitos: true
      }
    });
    const invoices = services.map(s => s.invoice).filter(Boolean);
    const invoiceIds = invoices.map(inv => inv.id);
    const remitos = services.flatMap(s => s.remitos);
    const remitoIds = remitos.map(r => r.id);

    // Buscar PaymentDocuments asociados a facturas y remitos de este edificio
    const paymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0)
      ? await prisma.paymentDocument.findMany({
          where: {
            OR: [
              ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
              ...(remitoIds.length > 0 ? [{ remitoId: { in: remitoIds } }] : [])
            ]
          },
          include: {
            payment: { include: { paymentMethod: true, documents: true } },
            invoice: true,
            remito: true
          }
        })
      : [];

    // Armar movimientos
    let movimientos = [];
    // Facturas
    for (const inv of invoices) {
      if (!inv) continue;
      if (type && type !== 'FACTURA') continue;
      if (from && new Date(inv.createdAt) < new Date(from)) continue;
      if (to && new Date(inv.createdAt) > new Date(to)) continue;
      movimientos.push({
        fecha: inv.createdAt,
        tipo: 'FACTURA',
        comprobante: inv.id,
        monto: inv.amount,
        descripcion: 'Factura',
        extra: {},
      });
    }
    // Remitos
    for (const rem of remitos) {
      if (type && type !== 'REMITO') continue;
      if (from && new Date(rem.date) < new Date(from)) continue;
      if (to && new Date(rem.date) > new Date(to)) continue;
      movimientos.push({
        fecha: rem.date,
        tipo: 'REMITO',
        comprobante: rem.number,
        monto: rem.amount,
        descripcion: 'Remito',
        extra: {},
      });
    }
    // Pagos (por PaymentDocument)
    for (const pd of paymentDocs) {
      if (!pd.payment) continue;
      if (type && type !== 'PAGO') continue;
      if (from && new Date(pd.payment.date) < new Date(from)) continue;
      if (to && new Date(pd.payment.date) > new Date(to)) continue;
      if (!pd.amount || pd.amount === 0) continue; // No mostrar pagos con monto 0
      
      const montoOriginalPago = pd.payment.originalAmount || pd.payment.amount;
      const montoAplicado = pd.amount;
      let descripcion = `Pago de ${formatCurrency(montoAplicado)}`;
      
      // Si el monto aplicado es diferente al monto total del pago, mostrar ambos
      if (Math.abs(montoAplicado - montoOriginalPago) > 0.01) {
        descripcion += ` (de un total de ${formatCurrency(montoOriginalPago)})`;
      }
      
      // Agregar información de descuento si existe
      if (pd.payment.discount > 0) {
        const descuentoPorcentaje = pd.payment.originalAmount ? 
          ((pd.payment.discount / pd.payment.originalAmount) * 100).toFixed(1) : 0;
        descripcion += ` - Descuento: ${formatCurrency(pd.payment.discount)} (${descuentoPorcentaje}%)`;
        if (pd.payment.discountReason) {
          descripcion += ` - ${pd.payment.discountReason}`;
        }
      }
      
      // Si el pago involucró más de un documento, mostrar información
      if (pd.payment.documents && pd.payment.documents.length > 1) {
        descripcion += ` - Pago distribuido entre ${pd.payment.documents.length} documentos`;
      }
      
      // Documentos asociados
      let docLabel = '';
      if (pd.invoiceId) {
        const factura = invoices.find(inv => inv.id === pd.invoiceId);
        docLabel = factura ? `Factura ${factura.id}` : 'Factura';
      } else if (pd.remitoId) {
        const remito = remitos.find(r => r.id === pd.remitoId);
        docLabel = remito ? `Remito ${remito.number}` : 'Remito';
      }
      
      const extra = {
        medio: pd.payment.paymentMethod ? pd.payment.paymentMethod.name : pd.payment.method,
        documentos: docLabel
      };
      
      // Agregar información de descuento al extra
      if (pd.payment.discount > 0) {
        extra.descuento = {
          monto: pd.payment.discount,
          razon: pd.payment.discountReason,
          montoOriginal: pd.payment.originalAmount
        };
      }
      
      movimientos.push({
        fecha: pd.payment.date,
        tipo: 'PAGO',
        comprobante: pd.payment.comprobante,
        monto: -Math.abs(montoAplicado), // Usar el monto aplicado específicamente a este edificio
        descripcion,
        extra,
      });
    }
    // Ordenar por fecha ascendente
    movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    // Calcular saldo parcial acumulado
    let saldo = 0;
    
    movimientos = movimientos.map(mov => {
      saldo += mov.monto;
      return { ...mov, saldoParcial: saldo };
    });
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener movimientos de cuenta corriente:', error);
    res.status(500).json({ message: 'Error al obtener movimientos de cuenta corriente' });
  }
};

// Obtener facturas y remitos pendientes de un edificio
const getPendingInvoices = async (req, res) => {
  try {
    const { id } = req.params;
    // Buscar servicios del edificio
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        invoice: true,
        remitos: true
      }
    });

    let pendientes = [];

    // Facturas pendientes (monto > suma de pagos asociados)
    for (const service of services) {
      if (service.invoice) {
        // Buscar pagos asociados a esta factura
        const paymentDocs = await prisma.paymentDocument.findMany({
          where: { invoiceId: service.invoice.id },
          include: { payment: true }
        });
        
        // Calcular el monto total pagado y descuentos aplicados
        let totalPagado = 0;
        let totalDescuentos = 0;
        
        for (const pd of paymentDocs) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) {
            totalDescuentos += pd.payment.discount;
          }
        }
        
        // El monto acordado es el original menos todos los descuentos aplicados
        const montoAcordado = service.invoice.amount - totalDescuentos;
        
        // El monto pendiente es: monto acordado a pagar - monto realmente pagado
        const montoPendiente = montoAcordado - totalPagado;
        
        if (montoPendiente > 0) {
          pendientes.push({
            id: service.invoice.id,
            type: 'FACTURA',
            serviceId: service.id,
            description: service.description,
            amount: montoPendiente,
            date: service.invoice.createdAt
          });
        }
      }
    }

    // Remitos pendientes (monto > suma de pagos asociados)
    for (const service of services) {
      for (const remito of service.remitos) {
        const paymentDocs = await prisma.paymentDocument.findMany({
          where: { remitoId: remito.id },
          include: { payment: true }
        });
        
        // Calcular el monto total pagado y descuentos aplicados
        let totalPagado = 0;
        let totalDescuentos = 0;
        
        for (const pd of paymentDocs) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) {
            totalDescuentos += pd.payment.discount;
          }
        }
        
        // El monto acordado es el original menos todos los descuentos aplicados
        const montoAcordado = remito.amount - totalDescuentos;
        
        // El monto pendiente es: monto acordado a pagar - monto realmente pagado
        const montoPendiente = montoAcordado - totalPagado;
        
        if (montoPendiente > 0) {
          pendientes.push({
            id: remito.id,
            type: 'REMITO',
            serviceId: service.id,
            description: service.description,
            amount: montoPendiente,
            date: remito.date
          });
        }
      }
    }

    res.json(pendientes);
  } catch (error) {
    console.error('Error al obtener facturas/remitos pendientes:', error);
    res.status(500).json({ message: 'Error al obtener facturas/remitos pendientes' });
  }
};

// Obtener localidades disponibles para edificios
const getAvailableLocalities = async (req, res) => {
  try {
    const localities = await prisma.zoneLocality.findMany({
      select: {
        locality: true
      },
      orderBy: {
        locality: 'asc'
      }
    });

    // Obtener localidades únicas
    const uniqueLocalities = [...new Set(localities.map(l => l.locality))];
    
    res.json(uniqueLocalities);
  } catch (error) {
    console.error('Error al obtener localidades disponibles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener detalles de cuenta corriente de un edificio específico
const getBuildingAccountDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        administrator: true,
        account: true
      }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    // Obtener todos los servicios del edificio
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        invoice: true,
        technician: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Obtener todas las facturas del edificio (incluyendo las de efectivo)
    const invoices = services.map(s => s.invoice).filter(Boolean);
    const invoiceIds = invoices.map(inv => inv.id);

    // Obtener todos los pagos asociados a las facturas de este edificio
    const paymentDocs = await prisma.paymentDocument.findMany({
      where: {
        invoiceId: { in: invoiceIds }
      },
      include: {
        payment: {
          include: {
            paymentMethod: true
          }
        },
        invoice: true
      },
      orderBy: {
        payment: {
          createdAt: 'asc'
        }
      }
    });

    // Crear un mapa de facturas con sus pagos asociados
    const invoicesWithPayments = invoices.map(invoice => {
      const associatedPaymentDocs = paymentDocs.filter(pd => pd.invoiceId === invoice.id);
      
      // Para facturas con método de pago EFECTIVO, considerar que ya están pagadas
      const isEfectivo = invoice.paymentMethod === 'EFECTIVO';
      
      // Calcular el total pagado usando pd.amount (monto aplicado a esta factura específica)
      const totalPaid = isEfectivo 
        ? invoice.amount 
        : associatedPaymentDocs.reduce((sum, pd) => sum + pd.amount, 0);
      
      // Calcular total de descuentos aplicados a esta factura
      const totalDiscounts = associatedPaymentDocs.reduce((sum, pd) => {
        return sum + (pd.payment?.discount || 0);
      }, 0);
      
      // El monto a pagar es el monto original menos los descuentos
      const amountToPay = invoice.amount - totalDiscounts;
      
      // El monto pendiente es el monto a pagar menos lo ya pagado
      const remaining = isEfectivo ? 0 : amountToPay - totalPaid;
      
      const result = {
        id: invoice.id,
        type: 'invoice',
        amount: invoice.amount,
        status: isEfectivo ? 'PAGADO' : invoice.status,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        service: services.find(s => s.invoice?.id === invoice.id),
        payments: associatedPaymentDocs.map(pd => ({
          ...pd.payment,
          amountApplied: pd.amount // Monto específico aplicado a esta factura
        })),
        totalPaid: totalPaid,
        remaining: remaining,
        isEfectivo: isEfectivo
      };
      
      console.log('🔍 [BACKEND] Factura procesada:', {
        id: result.id,
        paymentMethod: result.paymentMethod,
        isEfectivo: result.isEfectivo,
        status: result.status
      });
      
      return result;
    });

    // Crear un array cronológico de todas las transacciones
    const allTransactions = [];
    
    invoicesWithPayments.forEach(invoice => {
      // Agregar la factura
      const transactionToAdd = {
        ...invoice,
        displayType: 'invoice'
      };
      
      console.log('🔍 [BACKEND] Agregando transacción:', {
        id: transactionToAdd.id,
        displayType: transactionToAdd.displayType,
        paymentMethod: transactionToAdd.paymentMethod,
        isEfectivo: transactionToAdd.paymentMethod === 'EFECTIVO'
      });
      
      allTransactions.push(transactionToAdd);
      
      // Solo agregar pagos adicionales si NO es una factura en efectivo
      // (las facturas en efectivo ya están consideradas como pagadas)
      if (!invoice.isEfectivo) {
        invoice.payments.forEach(payment => {
          allTransactions.push({
            id: payment.id,
            type: 'payment',
            amount: payment.amountApplied, // Usar el monto aplicado específicamente a esta factura
            totalAmount: payment.originalAmount || payment.amount, // Monto total del pago (para referencia)
            status: 'PAGADO',
            createdAt: payment.createdAt,
            comprobante: payment.comprobante,
            paymentMethod: payment.paymentMethod,
            discount: payment.discount,
            discountReason: payment.discountReason,
            associatedInvoiceId: invoice.id,
            displayType: 'payment'
          });
        });
      }
    });

    // Ordenar por fecha de creación
    allTransactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calcular saldo actual
    const totalInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    // Usar pd.amount que es el monto aplicado específicamente a este edificio
    const totalPayments = paymentDocs.reduce((sum, pd) => sum + pd.amount, 0);
    // Calcular total de descuentos
    const totalDiscounts = paymentDocs.reduce((sum, pd) => sum + (pd.payment?.discount || 0), 0);
    // Saldo = Total Facturas - Total Pagos - Total Descuentos
    const currentBalance = totalInvoices - totalPayments - totalDiscounts;

    // DEBUG: Agregar logs para comparar con los listados
    console.log(`🔍 [DEBUG] Cuenta corriente edificio ${building.name} (${id}):`);
    console.log(`  - Facturas: ${invoices.length}, Total: ${totalInvoices}`);
    console.log(`  - Pagos totales: ${totalPayments}`);
    console.log(`  - Descuentos totales: ${totalDiscounts}`);
    console.log(`  - Saldo calculado: ${currentBalance}`);

    console.log('🔍 [BACKEND] Enviando respuesta final:', {
      totalTransactions: allTransactions.length,
      sampleTransaction: allTransactions[0] ? {
        id: allTransactions[0].id,
        displayType: allTransactions[0].displayType,
        paymentMethod: allTransactions[0].paymentMethod
      } : null
    });
    
    res.json({
      building,
      transactions: allTransactions,
      summary: {
        totalInvoices,
        totalPayments,
        totalDiscounts,
        currentBalance,
        totalTransactions: allTransactions.length
      }
    });

  } catch (error) {
    console.error('Error al obtener detalles de cuenta del edificio:', error);
    res.status(500).json({ message: 'Error al obtener detalles de cuenta del edificio' });
  }
};

// Registrar pago para un edificio específico
const createBuildingPayment = async (req, res) => {
  try {
    const { id: buildingId } = req.params;
    const {
      invoiceId,
      remitoId,
      paymentMethodId,
      amount,
      date,
      comprobante,
      discount,
      discountReason,
      documents
    } = req.body;

    console.log('💰 [BUILDING PAYMENT] Iniciando pago para edificio:', buildingId);
    console.log('💰 [BUILDING PAYMENT] Datos recibidos:', req.body);

    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        account: true
      }
    });

    if (!building) {
      console.log('❌ [BUILDING PAYMENT] Edificio no encontrado:', buildingId);
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    console.log('✅ [BUILDING PAYMENT] Edificio encontrado:', building.name);

    // Verificar que el edificio tiene una cuenta
    if (!building.account) {
      console.log('❌ [BUILDING PAYMENT] El edificio no tiene cuenta asociada');
      return res.status(400).json({ message: 'El edificio no tiene una cuenta asociada' });
    }

    console.log('✅ [BUILDING PAYMENT] Cuenta encontrada, saldo actual:', building.account.balance);

    // Verificar que la factura o el remito existe
    let invoiceOrRemito;
    if (invoiceId) {
      console.log('💰 [BUILDING PAYMENT] Buscando factura:', invoiceId);
      invoiceOrRemito = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });
    } else if (remitoId) {
      console.log('💰 [BUILDING PAYMENT] Buscando remito:', remitoId);
      invoiceOrRemito = await prisma.remito.findUnique({
        where: { id: remitoId }
      });
    } else {
      console.log('❌ [BUILDING PAYMENT] No se especificó invoiceId ni remitoId');
      return res.status(400).json({ message: 'Debe especificar invoiceId o remitoId' });
    }

    if (!invoiceOrRemito) {
      console.log('❌ [BUILDING PAYMENT] Factura o remito no encontrado');
      return res.status(404).json({ message: 'Factura o Remito no encontrado' });
    }

    console.log('✅ [BUILDING PAYMENT] Documento encontrado:', invoiceOrRemito.id);

    // Verificar que el método de pago existe
    console.log('💰 [BUILDING PAYMENT] Buscando método de pago:', paymentMethodId);
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    });

    if (!paymentMethod) {
      console.log('❌ [BUILDING PAYMENT] Método de pago no encontrado:', paymentMethodId);
      return res.status(404).json({ message: 'Método de pago no encontrado' });
    }

    console.log('✅ [BUILDING PAYMENT] Método de pago encontrado:', paymentMethod.name);

    // Verificar que el monto es positivo
    if (amount <= 0) {
      console.log('❌ [BUILDING PAYMENT] Monto inválido:', amount);
      return res.status(400).json({ message: 'El monto del pago debe ser positivo' });
    }

    console.log('✅ [BUILDING PAYMENT] Monto válido:', amount);

    // Verificar que el monto no excede el saldo pendiente de la factura/remito
    console.log('💰 [BUILDING PAYMENT] Verificando saldo pendiente...');
    const paymentDocuments = await prisma.paymentDocument.findMany({
      where: {
        invoiceId: invoiceId,
        remitoId: remitoId
      },
      include: {
        payment: true
      }
    });

    // Usar pd.amount que es el monto aplicado a esta factura/remito específico
    const totalPaid = paymentDocuments.reduce((sum, pd) => sum + pd.amount, 0);
    const remaining = invoiceOrRemito.amount - totalPaid;

    console.log('💰 [BUILDING PAYMENT] Saldo calculado:', {
      montoOriginal: invoiceOrRemito.amount,
      totalPagado: totalPaid,
      saldoPendiente: remaining,
      montoPago: amount
    });

    if (amount > remaining) {
      console.log('❌ [BUILDING PAYMENT] Monto excede saldo pendiente');
      return res.status(400).json({ message: `El monto del pago (${formatCurrency(amount)}) excede el saldo pendiente (${formatCurrency(remaining)})` });
    }

    console.log('✅ [BUILDING PAYMENT] Saldo válido, procediendo con el pago...');

    // Crear el pago primero
    console.log('💰 [BUILDING PAYMENT] Creando pago...');
    
    // Convertir la fecha a objeto Date si viene como string
    const paymentDate = typeof date === 'string' ? new Date(date) : date;
    
    const payment = await prisma.payment.create({
      data: {
        paymentMethodId: paymentMethodId,
        amount: amount,
        date: paymentDate,
        comprobante: comprobante,
        discount: discount,
        discountReason: discountReason,
        method: '' // Campo requerido por el modelo Payment
      }
    });

    console.log('✅ [BUILDING PAYMENT] Pago creado:', payment.id);

    // Crear el documento de pago
    console.log('💰 [BUILDING PAYMENT] Creando documento de pago...');
    const paymentDocument = await prisma.paymentDocument.create({
      data: {
        paymentId: payment.id,
        invoiceId: invoiceId,
        remitoId: remitoId,
        amount: amount
      },
      include: {
        payment: true
      }
    });

    console.log('✅ [BUILDING PAYMENT] Documento de pago creado:', paymentDocument.id);

    // Actualizar el saldo de la cuenta del edificio
    console.log('💰 [BUILDING PAYMENT] Actualizando saldo de la cuenta...');
    const newBalance = building.account.balance - amount;
    await prisma.account.update({
      where: { buildingId: buildingId },
      data: { balance: newBalance }
    });

    console.log('✅ [BUILDING PAYMENT] Saldo actualizado:', {
      saldoAnterior: building.account.balance,
      montoPago: amount,
      saldoNuevo: newBalance
    });

    console.log('✅ [BUILDING PAYMENT] Pago completado exitosamente');
    res.status(201).json(paymentDocument);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago' });
  }
};

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingAccount,
  getBuildingAccountMovements,
  getPendingInvoices,
  getAvailableLocalities,
  getBuildingAccountDetails,
  createBuildingPayment
}; 