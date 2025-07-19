const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los edificios
const getBuildings = async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      include: {
        administrator: true,
        account: true
      }
    });

    // Calcular el saldo real para cada edificio
    const buildingsWithBalance = await Promise.all(buildings.map(async (building) => {
      // Obtener servicios del edificio
      const services = await prisma.service.findMany({
        where: { buildingId: building.id },
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
      const paymentDocs = await prisma.paymentDocument.findMany({
        where: {
          OR: [
            { invoiceId: { in: invoiceIds } },
            { remitoId: { in: remitoIds } }
          ]
        },
        include: { payment: true }
      });

      // Calcular saldo normalmente (descuentos no afectan el cálculo de deuda pendiente)
      let saldo = 0;
      
      // Sumar todas las facturas y remitos
      for (const inv of invoices) {
        if (inv) saldo += inv.amount;
      }
      for (const rem of remitos) {
        saldo += rem.amount;
      }
      
      // Restar todos los pagos usando el monto original del pago
      for (const pd of paymentDocs) {
        const montoOriginalPago = pd.payment.originalAmount || pd.payment.amount;
        saldo -= montoOriginalPago;
      }

      // Actualizar el saldo en la cuenta
      await prisma.account.update({
        where: { buildingId: building.id },
        data: { balance: saldo }
      });

      return {
        ...building,
        account: {
          ...building.account,
          balance: saldo
        }
      };
    }));

    res.json(buildingsWithBalance);
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
    const { name, address, cuit, contact, taxCondition, administratorId } = req.body;

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
    const { name, address, cuit, contact, taxCondition, administratorId } = req.body;

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
        administratorId
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

    // Verificar si el edificio tiene servicios asociados
    const services = await prisma.service.findMany({
      where: { buildingId: id }
    });

    if (services.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el edificio porque tiene servicios asociados' 
      });
    }

    await prisma.building.delete({
      where: { id }
    });

    res.json({ message: 'Edificio eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar edificio:', error);
    res.status(500).json({ message: 'Error al eliminar edificio' });
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
    const paymentDocs = await prisma.paymentDocument.findMany({
      where: {
        OR: [
          { invoiceId: { in: invoiceIds } },
          { remitoId: { in: remitoIds } }
        ]
      },
      include: {
        payment: { include: { paymentMethod: true, documents: true } },
        invoice: true,
        remito: true
      }
    });

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
      let descripcion = `Pago de ${formatCurrency(montoOriginalPago)}`;
      
      // Agregar información de descuento si existe
      if (pd.payment.discount > 0) {
        const descuentoPorcentaje = pd.payment.originalAmount ? 
          ((pd.payment.discount / pd.payment.originalAmount) * 100).toFixed(1) : 0;
        descripcion += ` (con descuento de ${formatCurrency(pd.payment.discount)} - ${descuentoPorcentaje}%)`;
        if (pd.payment.discountReason) {
          descripcion += ` - ${pd.payment.discountReason}`;
        }
      }
      
      // Si el pago involucró más de un documento, mostrar el total para información
      if (pd.payment.documents && pd.payment.documents.length > 1) {
        descripcion += ` (total pagado: ${formatCurrency(montoOriginalPago)})`;
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
        monto: -Math.abs(montoOriginalPago),
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

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingAccount,
  getBuildingAccountMovements,
  getPendingInvoices
}; 