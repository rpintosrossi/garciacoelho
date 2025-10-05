const prisma = require('../lib/prisma');

const getQuickStats = async (req, res) => {
  try {
    // Obtener estadísticas básicas en paralelo
    const [totalBuildings, totalAdmins, totalServices] = await Promise.all([
      prisma.building.count(),
      prisma.administrator.count(),
      prisma.service.count(),
    ]);

    // Calcular fechas de inicio y fin de mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Obtener estadísticas del mes en paralelo
    const [pagosMes, facturasMes, remitosMes] = await Promise.all([
      prisma.payment.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        select: { amount: true }
      }),
      prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        select: { amount: true }
      }),
      prisma.remito.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        select: { amount: true }
      })
    ]);

    const totalPagosMes = pagosMes.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalFacturadoMes = 
      facturasMes.reduce((sum, f) => sum + (f.amount || 0), 0) +
      remitosMes.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Obtener edificios con cuentas para calcular saldos
    const buildings = await prisma.building.findMany({
      include: {
        account: true,
      }
    });

    // Calcular saldos totales usando consultas optimizadas
    let saldoTotalFavor = 0;
    let edificiosSaldoNegativo = 0;

    // Obtener todos los servicios, facturas y remitos en una sola consulta
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
    for (const building of buildings) {
      const buildingServices = servicesByBuilding[building.id] || [];
      const invoices = buildingServices.map(s => s.invoice).filter(Boolean);
      const remitos = buildingServices.flatMap(s => s.remitos);

      let saldo = 0;
      
      // Sumar todas las facturas (como en la cuenta corriente)
      for (const inv of invoices) {
        saldo += inv.amount;
      }
      
      // Restar todos los pagos (como en la cuenta corriente)
      for (const inv of invoices) {
        const paymentDocs = paymentDocsByInvoice[inv.id] || [];
        for (const pd of paymentDocs) {
          saldo -= (pd.payment.originalAmount || pd.payment.amount);
        }
      }

      if (saldo > 0) {
        saldoTotalFavor += saldo;
      } else if (saldo < 0) {
        edificiosSaldoNegativo++;
      }
    }

    res.json({
      totalBuildings,
      totalAdmins,
      totalServices,
      totalPagosMes,
      totalFacturadoMes,
      saldoTotalFavor,
      edificiosSaldoNegativo
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

// Obtener empresas con deudas que superen el umbral de tolerancia
const getBuildingsWithOverdueDebts = async (req, res) => {
  try {
    // Obtener todos los edificios con su umbral de deuda configurado
    const buildings = await prisma.building.findMany({
      include: {
        administrator: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        account: true,
        services: {
          include: {
            invoice: true,
            remitos: true
          }
        }
      }
    });

    const buildingsWithDebts = [];

    for (const building of buildings) {
      // Calcular el saldo actual del edificio
      let saldo = 0;
      
      // Sumar todas las facturas
      for (const service of building.services) {
        if (service.invoice) {
          saldo += service.invoice.amount;
        }
        for (const remito of service.remitos) {
          saldo += remito.amount;
        }
      }

      // Restar todos los pagos
      const buildingInvoiceIds = building.services
        .map(s => s.invoice?.id)
        .filter(Boolean);
      const buildingRemitoIds = building.services
        .flatMap(s => s.remitos.map(r => r.id));
      
      const paymentDocuments = (buildingInvoiceIds.length > 0 || buildingRemitoIds.length > 0)
        ? await prisma.paymentDocument.findMany({
            where: {
              OR: [
                ...(buildingInvoiceIds.length > 0 ? [{ invoiceId: { in: buildingInvoiceIds } }] : []),
                ...(buildingRemitoIds.length > 0 ? [{ remitoId: { in: buildingRemitoIds } }] : [])
              ]
            },
            include: {
              payment: true
            }
          })
        : [];

      for (const pd of paymentDocuments) {
        saldo -= (pd.payment.originalAmount || pd.payment.amount);
      }

      // Verificar si la deuda supera el umbral configurado
      const debtThreshold = building.debtThreshold || 30; // días por defecto
      const hasOverdueDebt = saldo > 0;

      if (hasOverdueDebt) {
        // Calcular días de atraso (usando la fecha más antigua de factura/remito)
        let oldestDate = null;
        for (const service of building.services) {
          if (service.invoice && service.invoice.date) {
            if (!oldestDate || service.invoice.date < oldestDate) {
              oldestDate = service.invoice.date;
            }
          }
          for (const remito of service.remitos) {
            if (!oldestDate || remito.date < oldestDate) {
              oldestDate = remito.date;
            }
          }
        }

        let daysOverdue = 0;
        if (oldestDate) {
          const now = new Date();
          const diffTime = Math.abs(now - oldestDate);
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        buildingsWithDebts.push({
          id: building.id,
          name: building.name,
          cuit: building.cuit,
          address: building.address,
          locality: building.locality,
          debtThreshold,
          currentDebt: saldo,
          daysOverdue,
          isOverThreshold: daysOverdue > debtThreshold,
          administrator: building.administrator,
          lastInvoiceDate: oldestDate
        });
      }
    }

    // Ordenar por días de atraso (mayor a menor)
    buildingsWithDebts.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      totalBuildingsWithDebts: buildingsWithDebts.length,
      buildingsOverThreshold: buildingsWithDebts.filter(b => b.isOverThreshold).length,
      buildings: buildingsWithDebts
    });

  } catch (error) {
    console.error('Error al obtener edificios con deudas:', error);
    res.status(500).json({ message: 'Error al obtener información de deudas' });
  }
};

module.exports = {
  getQuickStats,
  getBuildingsWithOverdueDebts
}; 