const prisma = require('../lib/prisma');
const {
  calculateBalanceFromData,
  getInvoiceRemaining,
  recalculateBuildingBalance,
  recalculateAllBalances,
  dedupeInvoices
} = require('../services/buildingBalanceService');
const {
  serviceInvoicesInclude,
  getServiceInvoices,
  withServiceInvoices
} = require('../utils/serviceInvoiceHelpers');

// Función auxiliar para capitalizar la primera letra de cada palabra
const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Extrae el número inicial del nombre (ej: "12 Torre Centro" → 12) para orden natural
const extractLeadingNumber = (name) => {
  if (!name) return Number.MAX_SAFE_INTEGER;
  const match = String(name).match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
};

const compareBuildingNames = (a, b) => {
  const numA = extractLeadingNumber(a);
  const numB = extractLeadingNumber(b);
  if (numA !== numB) return numA - numB;
  return String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' });
};

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
          { address: { contains: search, mode: 'insensitive' } },
          { locality: { contains: search, mode: 'insensitive' } },
          { administrator: { name: { contains: search, mode: 'insensitive' } } },
          { administrator: { cuit: { contains: search, mode: 'insensitive' } } }
        ]
      };
    }

    // Contar total de edificios
    const total = await prisma.building.count({ where: whereClause });

    // Ordenar por número inicial del nombre (paginación correcta entre páginas)
    const buildingsForSort = await prisma.building.findMany({
      where: whereClause,
      select: { id: true, name: true }
    });
    const sortedIds = buildingsForSort
      .sort((a, b) => compareBuildingNames(a.name, b.name))
      .map((b) => b.id);
    const pageIds = sortedIds.slice(skip, skip + limit);

    // Obtener edificios de la página con administrador y cuenta
    const buildingsUnordered = pageIds.length > 0
      ? await prisma.building.findMany({
          where: { id: { in: pageIds } },
          include: {
            administrator: true,
            account: true
          }
        })
      : [];

    // Preservar el orden numérico
    const buildingsById = new Map(buildingsUnordered.map((b) => [b.id, b]));
    const buildings = pageIds.map((id) => buildingsById.get(id)).filter(Boolean);

    // Usar saldo persistido en Account (se actualiza en pagos / mantenimiento).
    // Evita recalcular y escribir en cada listado.
    res.json({
      buildings,
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

    // Validar campos obligatorios
    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }
    if (!address) {
      return res.status(400).json({ message: 'La dirección es obligatoria' });
    }
    if (!cuit) {
      return res.status(400).json({ message: 'El CUIT es obligatorio' });
    }
    if (!contact) {
      return res.status(400).json({ message: 'El contacto es obligatorio' });
    }
    if (!taxCondition) {
      return res.status(400).json({ message: 'La condición fiscal es obligatoria' });
    }
    if (!administratorId) {
      return res.status(400).json({ message: 'El administrador es obligatorio' });
    }

    // Verificar que el administrador existe
    const administrator = await prisma.administrator.findUnique({
      where: { id: administratorId }
    });

    if (!administrator) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    const building = await prisma.building.create({
      data: {
        name: capitalizeFirstLetter(name),
        address,
        cuit,
        contact,
        taxCondition,
        administratorId,
        debtThreshold: debtThreshold || 30,
        rating: rating || 1,
        managerPhone: managerPhone || null,
        generalInfo: generalInfo || null,
        doormanType: doormanType || null,
        floors: floors ? parseInt(floors) : null,
        apartments: apartments ? parseInt(apartments) : null,
        phones: phones || [],
        phoneNames: phoneNames || [],
        locality: locality || null,
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

    const building = await prisma.building.update({
      where: { id },
      data: {
        name: capitalizeFirstLetter(name),
        address,
        cuit,
        contact,
        taxCondition,
        administratorId,
        debtThreshold,
        rating,
        managerPhone: managerPhone || null,
        generalInfo: generalInfo || null,
        doormanType: doormanType || null,
        floors: floors ? parseInt(floors) : null,
        apartments: apartments ? parseInt(apartments) : null,
        phones,
        phoneNames,
        locality: locality || null
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
        invoiceServices: {
          include: {
            invoice: {
              include: {
                paymentDocuments: true
              }
            }
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

    const deletedInvoiceIds = new Set();

    // Eliminar en orden correcto (de dependencias a principales)
    for (const service of services) {
      console.log(`🗑️ [BUILDINGS] Procesando servicio: ${service.id}`);

      // 1. Eliminar PaymentDocuments y facturas (todas las vinculadas al servicio)
      for (const invoice of getServiceInvoices(service)) {
        if (deletedInvoiceIds.has(invoice.id)) continue;
        deletedInvoiceIds.add(invoice.id);

        const invoicePaymentDocs = invoice.paymentDocuments || [];
        if (invoicePaymentDocs.length > 0) {
          console.log(`🗑️ [BUILDINGS] Eliminando ${invoicePaymentDocs.length} documentos de pago de factura`);
          await prisma.paymentDocument.deleteMany({
            where: {
              invoiceId: invoice.id
            }
          });
        }

        // 2. Eliminar la factura
        console.log(`🗑️ [BUILDINGS] Eliminando factura: ${invoice.id}`);
        await prisma.invoice.delete({
          where: { id: invoice.id }
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

    // 6. Eliminar pagos huérfanos (si los hay) - buscar por PaymentDocuments sin invoice ni remito
    // Como ya eliminamos las facturas y remitos, los PaymentDocuments se eliminan en cascada
    // Solo necesitamos eliminar los pagos que ahora están huérfanos
    const orphanPayments = await prisma.payment.findMany({
      where: {
        documents: {
          none: {} // Pagos sin documentos asociados (quedaron huérfanos)
        }
      }
    });

    if (orphanPayments.length > 0) {
      console.log(`🗑️ [BUILDINGS] Eliminando ${orphanPayments.length} pagos huérfanos`);
      for (const payment of orphanPayments) {
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
        invoiceServices: {
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
        }
      }
    });

    // Armar la lista de facturas y pagos
    let accountDetails = [];
    let saldoAFavor = 0;
    const processedInvoiceIds = new Set();

    for (const service of services) {
      for (const invoice of getServiceInvoices(service)) {
        if (processedInvoiceIds.has(invoice.id)) continue;
        processedInvoiceIds.add(invoice.id);

        const paymentDocuments = invoice.paymentDocuments || [];
        const totalPagado = paymentDocuments.reduce((sum, pd) => sum + pd.amount, 0);
        const saldoFactura = invoice.amount - totalPagado;
        // Si pagó de más, sumar al saldo a favor
        if (saldoFactura < 0) {
          saldoAFavor += Math.abs(saldoFactura);
        }
        accountDetails.push({
          factura: {
            id: invoice.id,
            serviceId: service.id,
            amount: invoice.amount,
            status: invoice.status,
            createdAt: invoice.createdAt,
            updatedAt: invoice.updatedAt
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
        ...serviceInvoicesInclude,
        remitos: true
      }
    });
    const invoices = dedupeInvoices(services);
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
    const services = await prisma.service.findMany({
      where: { buildingId: id },
      include: {
        ...serviceInvoicesInclude,
        remitos: true
      }
    });

    const remitoIds = services.flatMap((s) => s.remitos.map((r) => r.id));
    const remitoPaymentDocs = remitoIds.length > 0
      ? await prisma.paymentDocument.findMany({
          where: { remitoId: { in: remitoIds } },
          include: { payment: true }
        })
      : [];

    const paymentDocsByRemito = remitoPaymentDocs.reduce((acc, pd) => {
      if (!pd.remitoId) return acc;
      if (!acc[pd.remitoId]) acc[pd.remitoId] = [];
      acc[pd.remitoId].push(pd);
      return acc;
    }, {});

    const pendientes = [];
    const processedInvoices = new Map();

    for (const service of services) {
      for (const invoice of getServiceInvoices(service)) {
        if (processedInvoices.has(invoice.id)) continue;
        processedInvoices.set(invoice.id, true);

        // paymentDocuments ya vienen en serviceInvoicesInclude
        const montoPendiente = getInvoiceRemaining(invoice, invoice.paymentDocuments || []);

        if (montoPendiente > 0.01) {
          pendientes.push({
            id: invoice.id,
            type: 'FACTURA',
            serviceId: service.id,
            number: invoice.number || null,
            description: service.description,
            amount: montoPendiente,
            date: invoice.createdAt
          });
        }
      }
    }

    for (const service of services) {
      for (const remito of service.remitos) {
        const montoPendiente = getInvoiceRemaining(
          remito,
          paymentDocsByRemito[remito.id] || []
        );

        if (montoPendiente > 0.01) {
          pendientes.push({
            id: remito.id,
            type: 'REMITO',
            serviceId: service.id,
            number: remito.number || null,
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
        ...serviceInvoicesInclude,
        technician: true,
        remitos: true // Incluir remitos con todas sus imágenes
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Obtener todas las facturas del edificio (incluyendo las de efectivo) - DEDUPLICADAS
    const invoices = dedupeInvoices(services);
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

      const remaining = getInvoiceRemaining(invoice, associatedPaymentDocs);

      const result = {
        id: invoice.id,
        type: 'invoice',
        amount: invoice.amount,
        status: isEfectivo ? 'PAGADO' : invoice.status,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        number: invoice.number, // Número de factura real
        service: services.find(s => getServiceInvoices(s).some(inv => inv.id === invoice.id)),
        services: services.filter(s => getServiceInvoices(s).some(inv => inv.id === invoice.id)), // TODOS los servicios de esta factura
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

    // Saldo canónico: facturas (sin EFECTIVO) − pagos − descuentos (1 vez por pago)
    const { totalInvoiced, totalPaid: totalPayments, totalDiscounts, balance: currentBalance } =
      calculateBalanceFromData(invoices, paymentDocs);
    const totalInvoices = totalInvoiced;

    console.log(`🔍 [DEBUG] Cuenta corriente edificio ${building.name} (${id}):`, {
      totalInvoices,
      totalPayments,
      totalDiscounts,
      currentBalance
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
      comment,
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

    // Determinar si se envían múltiples documentos con distribución ya calculada
    const hasMultipleDocs = Array.isArray(documents) && documents.length > 0;

    let docsToProcess = [];

    if (hasMultipleDocs) {
      // El frontend ya calculó la distribución (puede incluir excedente = saldo a favor)
      const totalDocsAmount = documents.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      console.log('💰 [BUILDING PAYMENT] Distribución recibida del frontend:', {
        cantidadDocumentos: documents.length,
        totalDistribuido: totalDocsAmount,
        montoPago: amount,
        saldoEdificio: building.account.balance
      });

      if (totalDocsAmount > parseFloat(amount) + 0.01) {
        return res.status(400).json({
          message: 'La suma de los montos aplicados a los documentos no puede superar el monto total del pago.'
        });
      }

      docsToProcess = documents.map(d => ({ id: d.id, type: d.type, amount: parseFloat(d.amount) }));
    } else {
      // Solo un documento: se permite pagar de más (el excedente queda como saldo a favor)
      const existingPaymentDocs = await prisma.paymentDocument.findMany({
        where: invoiceId ? { invoiceId } : { remitoId },
        include: { payment: true }
      });
      const remaining = getInvoiceRemaining(invoiceOrRemito, existingPaymentDocs);

      console.log('💰 [BUILDING PAYMENT] Saldo calculado:', {
        montoOriginal: invoiceOrRemito.amount,
        saldoPendiente: remaining,
        montoPago: amount,
        esPagoMayor: amount > remaining + 0.01
      });

      docsToProcess = [{ id: invoiceId || remitoId, type: invoiceId ? 'FACTURA' : 'REMITO', amount }];
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
        originalAmount: req.body.originalAmount != null
          ? parseFloat(req.body.originalAmount)
          : (discount ? parseFloat(amount) + parseFloat(discount || 0) : parseFloat(amount)),
        date: paymentDate,
        comprobante: comprobante,
        discount: discount ? parseFloat(discount) : 0,
        discountReason: discountReason,
        comment: comment || null,
        method: '' // Campo requerido por el modelo Payment
      }
    });

    console.log('✅ [BUILDING PAYMENT] Pago creado:', payment.id);

    // Crear un PaymentDocument por cada documento distribuido
    console.log('💰 [BUILDING PAYMENT] Creando documentos de pago...');
    const createdPaymentDocuments = [];
    for (const doc of docsToProcess) {
      const pd = await prisma.paymentDocument.create({
        data: {
          paymentId: payment.id,
          invoiceId: doc.type === 'FACTURA' ? doc.id : null,
          remitoId: doc.type === 'REMITO' ? doc.id : null,
          amount: doc.amount
        },
        include: { payment: true }
      });
      createdPaymentDocuments.push(pd);
      console.log(`✅ [BUILDING PAYMENT] PaymentDocument creado: ${pd.id}`);
    }

    // Recalcular saldo canónico (incluye descuento una sola vez)
    console.log('💰 [BUILDING PAYMENT] Recalculando saldo de la cuenta...');
    const { balance: newBalance } = await recalculateBuildingBalance(buildingId);

    console.log('✅ [BUILDING PAYMENT] Saldo actualizado:', {
      saldoAnterior: building.account.balance,
      montoPago: amount,
      descuento: discount || 0,
      saldoNuevo: newBalance
    });

    console.log('✅ [BUILDING PAYMENT] Pago completado exitosamente');
    res.status(201).json(createdPaymentDocuments[0]);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago' });
  }
};

// Obtener historial de servicios de un edificio
const getBuildingServiceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const skip = (page - 1) * limit;

    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        administrator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    // Construir filtro
    const whereClause = {
      buildingId: id,
    };

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        // Ajustar endDate para incluir todo el día
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      // Filtrar por fecha del remito (lo que muestra la columna Fecha)
      // o por visitDate si el servicio no tiene remitos
      whereClause.OR = [
        { remitos: { some: { date: dateFilter } } },
        { remitos: { none: {} }, visitDate: dateFilter }
      ];
    }

    // Obtener total de registros para paginación
    const total = await prisma.service.count({ where: whereClause });

    // Obtener todos los serviciosmatching filters para calcular resumen
    // Nota: Esto podría optimizarse usando agregate de Prisma, pero mantenemos la lógica actual por consistencia
    const servicesForSummary = await prisma.service.findMany({
      where: whereClause,
      include: {
        invoiceServices: {
          include: {
            invoice: {
              include: {
                paymentDocuments: {
                  include: { payment: true }
                }
              }
            }
          }
        },
        remitos: {
          include: {
            paymentDocuments: {
              include: { payment: true }
            }
          }
        }
      }
    });

    // Obtener servicios paginados para mostrar
    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        technician: {
          select: {
            id: true,
            name: true
          }
        },
        remitos: {
          include: {
            paymentDocuments: {
              include: {
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    date: true,
                    method: true,
                    comprobante: true
                  }
                }
              }
            }
          }
        },
        invoiceServices: {
          include: {
            invoice: {
              include: {
                paymentDocuments: {
                  include: {
                    payment: {
                      select: {
                        id: true,
                        amount: true,
                        discount: true,
                        date: true,
                        method: true,
                        comprobante: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        noChargeReason: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Calcular totales usando servicesForSummary
    const totalServices = servicesForSummary.length;
    const totalRemitos = servicesForSummary.reduce((sum, s) => sum + s.remitos.length, 0);

    // Deduplicar facturas (múltiples servicios pueden compartir la misma factura)
    const uniqueInvoices = dedupeInvoices(servicesForSummary);
    const totalInvoices = uniqueInvoices.length;

    // Calcular saldo canónico (facturas − pagos − descuentos una vez)
    let totalInvoiced = 0;
    let totalPaid = 0;

    const allInvoicePaymentDocs = [];
    for (const inv of uniqueInvoices) {
      if (inv.paymentDocuments) {
        allInvoicePaymentDocs.push(...inv.paymentDocuments);
      }
    }
    const balanceCalc = calculateBalanceFromData(uniqueInvoices, allInvoicePaymentDocs);
    totalInvoiced = balanceCalc.totalInvoiced;
    totalPaid = balanceCalc.totalPaid + balanceCalc.totalDiscounts;

    res.json({
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        cuit: building.cuit,
        administrator: building.administrator
      },
      summary: {
        totalServices,
        totalInvoices,
        totalRemitos,
        totalInvoiced,
        totalPaid,
        pending: balanceCalc.balance
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      services: services.map(service => {
        const enriched = withServiceInvoices(service);
        const invoice = enriched.invoice;
        return {
          id: service.id,
          name: service.name,
          description: service.description,
          status: service.status,
          isPaid: enriched.isPaid,
          createdAt: service.createdAt,
          visitDate: service.visitDate,
          technician: service.technician,
          noChargeReason: service.noChargeReason || null,
          noChargeComment: service.noChargeComment || null,
          remitos: service.remitos.map(remito => ({
            id: remito.id,
            number: remito.number,
            amount: remito.amount,
            date: remito.date,
            status: remito.status,
            receiptImages: remito.receiptImages,
            payments: remito.paymentDocuments?.map(pd => ({
              id: pd.payment.id,
              amount: pd.amount,
              date: pd.payment.date,
              method: pd.payment.method,
              comprobante: pd.payment.comprobante
            })) || []
          })),
          invoices: enriched.invoices.map(inv => ({
            id: inv.id,
            number: inv.number,
            amount: inv.amount,
            date: inv.date,
            status: inv.status,
            fileUrl: inv.fileUrl,
            payments: inv.paymentDocuments?.map(pd => ({
              id: pd.payment.id,
              amount: pd.amount,
              date: pd.payment.date,
              method: pd.payment.method,
              comprobante: pd.payment.comprobante
            })) || []
          })),
          invoice: invoice ? {
            id: invoice.id,
            number: invoice.number,
            amount: invoice.amount,
            date: invoice.date,
            status: invoice.status,
            fileUrl: invoice.fileUrl,
            payments: invoice.paymentDocuments?.map(pd => ({
              id: pd.payment.id,
              amount: pd.amount,
              date: pd.payment.date,
              method: pd.payment.method,
              comprobante: pd.payment.comprobante
            })) || []
          } : null
        };
      })
    });
  } catch (error) {
    console.error('Error al obtener historial de servicios:', error);
    res.status(500).json({ message: 'Error al obtener historial de servicios' });
  }
};

// Búsqueda liviana de edificios para autocomplete (no calcula saldos)
const searchBuildingsAutocomplete = async (req, res) => {
  try {
    const search = req.query.search || '';
    if (search.length < 2) return res.json([]);

    const buildings = await prisma.building.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cuit: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { locality: { contains: search, mode: 'insensitive' } },
          { administrator: { name: { contains: search, mode: 'insensitive' } } },
          { administrator: { cuit: { contains: search, mode: 'insensitive' } } }
        ]
      },
      include: {
        administrator: true,
        account: true
      },
      take: 50
    });

    buildings.sort((a, b) => compareBuildingNames(a.name, b.name));
    res.json(buildings.slice(0, 20));
  } catch (error) {
    console.error('Error en búsqueda autocomplete:', error);
    res.status(500).json({ message: 'Error al buscar edificios' });
  }
};

// Recalcular saldos de todos los edificios (mantenimiento)
const recalculateAllBuildingBalances = async (req, res) => {
  try {
    console.log('🔄 [BALANCES] Iniciando recálculo de saldos de todos los edificios...');
    const { updated, results } = await recalculateAllBalances();
    console.log(`✅ [BALANCES] Recálculo completado: ${updated} edificios actualizados`);
    res.json({
      message: `Se recalcularon los saldos de ${updated} edificios`,
      updated,
      results
    });
  } catch (error) {
    console.error('Error al recalcular saldos:', error);
    res.status(500).json({ message: 'Error al recalcular saldos de edificios' });
  }
};

/**
 * Remitos de un edificio cuyo servicio ya tiene al menos una factura.
 * Para el flujo "Facturar un remito facturado".
 * Query: ?search= (número de remito, descripción o nombre del servicio)
 */
const getInvoicedRemitos = async (req, res) => {
  try {
    const { id: buildingId } = req.params;
    const search = String(req.query.search || '').trim();

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true, address: true }
    });
    if (!building) {
      return res.status(404).json({ message: 'Edificio no encontrado' });
    }

    const where = {
      AND: [
        {
          service: {
            buildingId,
            invoiceServices: { some: {} },
            status: { in: ['FACTURADO', 'FACTURADO_PARCIAL'] }
          }
        },
        ...(search
          ? [{
              OR: [
                { number: { contains: search, mode: 'insensitive' } },
                { service: { description: { contains: search, mode: 'insensitive' } } },
                { service: { name: { contains: search, mode: 'insensitive' } } }
              ]
            }]
          : [])
      ]
    };

    const remitos = await prisma.remito.findMany({
      where,
      include: {
        service: {
          include: {
            ...serviceInvoicesInclude,
            technician: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100
    });

    const items = remitos.map((remito) => {
      const enriched = withServiceInvoices(remito.service);
      const invoices = enriched.invoices || [];
      return {
        id: remito.id,
        number: remito.number,
        amount: remito.amount,
        date: remito.date,
        receiptImages: remito.receiptImages,
        service: {
          id: enriched.id,
          name: enriched.name,
          description: enriched.description,
          status: enriched.status,
          visitDate: enriched.visitDate,
          technician: enriched.technician
        },
        invoices: invoices.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount,
          status: inv.status,
          date: inv.date,
          isProv: inv.status === 'PENDIENTE'
        })),
        invoiceCount: invoices.length
      };
    });

    res.json({ building, remitos: items });
  } catch (error) {
    console.error('Error al listar remitos facturados:', error);
    res.status(500).json({ message: 'Error al listar remitos facturados' });
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
  createBuildingPayment,
  getBuildingServiceHistory,
  searchBuildingsAutocomplete,
  recalculateAllBuildingBalances,
  getInvoicedRemitos
}; 