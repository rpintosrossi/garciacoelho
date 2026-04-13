const prisma = require('../lib/prisma');

const getQuickStats = async (req, res) => {
  try {
    // Obtener estadísticas básicas en paralelo
    const [totalBuildings, totalAdmins, totalServices] = await Promise.all([
      prisma.building.count(),
      prisma.administrator.count(),
      prisma.service.count({
        where: {
          status: {
            in: ['CON_REMITO', 'FACTURADO']
          }
        }
      }),
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

// Obtener pagos agrupados por método de pago y mes (últimos 12 meses)
const getPaymentsByMethod = async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const payments = await prisma.payment.findMany({
      where: { date: { gte: since } },
      select: { amount: true, method: true, date: true }
    });

    // Agrupar por mes y método
    const map = {}; // { 'YYYY-MM': { metodo: total } }
    for (const p of payments) {
      const d = new Date(p.date);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = {};
      map[key][p.method] = (map[key][p.method] || 0) + p.amount;
    }

    // Obtener todos los métodos distintos
    const allMethods = [...new Set(payments.map(p => p.method))].sort();

    // Convertir a array ordenado por mes
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const data = Object.keys(map).sort().map(mesKey => {
      const [y, m] = mesKey.split('-');
      const row = { mes: `${monthNames[+m - 1]} ${y}` };
      for (const method of allMethods) {
        row[method] = map[mesKey][method] || 0;
      }
      return row;
    });

    res.json({ data, methods: allMethods });
  } catch (error) {
    console.error('Error al obtener pagos por método:', error);
    res.status(500).json({ message: 'Error al obtener pagos por método' });
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
      // Usar directamente el saldo de la cuenta en lugar de recalcular
      const saldo = building.account?.balance || 0;

      // Verificar si la deuda supera el umbral configurado
      const debtThreshold = building.debtThreshold || 30; // días por defecto
      const hasOverdueDebt = saldo > 0;

      if (hasOverdueDebt) {
        // Obtener IDs únicos de facturas pendientes
        const uniqueInvoiceIds = [...new Set(building.services
          .map(s => s.invoice?.id)
          .filter(Boolean))];

        // Calcular días de atraso usando la fecha más antigua de las facturas pendientes
        let oldestDate = null;
        
        if (uniqueInvoiceIds.length > 0) {
          const invoices = await prisma.invoice.findMany({
            where: { id: { in: uniqueInvoiceIds } },
            select: {
              id: true,
              date: true,
              createdAt: true,
              amount: true,
              paymentDocuments: { select: { amount: true } }
            }
          });

          for (const invoice of invoices) {
            const totalPaid = invoice.paymentDocuments.reduce((sum, pd) => sum + pd.amount, 0);
            const hasPendingBalance = totalPaid < invoice.amount;
            if (!hasPendingBalance) continue;

            // Usar date si existe, sino createdAt
            const invoiceDate = invoice.date || invoice.createdAt;
            if (invoiceDate && (!oldestDate || invoiceDate < oldestDate)) {
              oldestDate = invoiceDate;
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
  getBuildingsWithOverdueDebts,
  getPaymentsByMethod
}; 