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

    // Agregar a nivel DB; usa el nombre del PaymentMethod relacionado o el campo method como fallback
    const rows = await prisma.$queryRaw`
      SELECT
        TO_CHAR(p.date AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key,
        COALESCE(pm.name, p.method) AS method_name,
        SUM(p.amount) AS total
      FROM "Payment" p
      LEFT JOIN "PaymentMethod" pm ON p."paymentMethodId" = pm.id
      WHERE p.date >= ${since}
      GROUP BY month_key, method_name
      ORDER BY month_key
    `;

    const map = {};
    const methodSet = new Set();
    for (const row of rows) {
      const key = row.month_key;
      const method = row.method_name;
      if (!map[key]) map[key] = {};
      map[key][method] = Number(row.total);
      methodSet.add(method);
    }

    const allMethods = [...methodSet].sort();
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const data = Object.keys(map).sort().map(mesKey => {
      const [y, m] = mesKey.split('-');
      const row = { mes: `${monthNames[+m - 1]} ${y}` };
      for (const method of allMethods) row[method] = map[mesKey][method] || 0;
      return row;
    });

    res.json({ data, methods: allMethods });
  } catch (error) {
    console.error('Error al obtener pagos por método:', error);
    res.status(500).json({ message: 'Error al obtener pagos por método' });
  }
};

// Facturado vs Cobrado por mes (últimos 12 meses)
const getInvoicedVsCollected = async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Agregar a nivel DB para evitar cargar todos los registros en memoria
    const [invoiceRows, remitoRows, paymentRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key, SUM(amount) AS total
        FROM "Invoice" WHERE "createdAt" >= ${since} GROUP BY month_key
      `,
      prisma.$queryRaw`
        SELECT TO_CHAR(date AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key, SUM(amount) AS total
        FROM "Remito" WHERE date >= ${since} GROUP BY month_key
      `,
      prisma.$queryRaw`
        SELECT TO_CHAR(date AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key, SUM(amount) AS total
        FROM "Payment" WHERE date >= ${since} GROUP BY month_key
      `
    ]);

    const facturado = {};
    const cobrado = {};

    for (const row of invoiceRows) facturado[row.month_key] = (facturado[row.month_key] || 0) + Number(row.total);
    for (const row of remitoRows) facturado[row.month_key] = (facturado[row.month_key] || 0) + Number(row.total);
    for (const row of paymentRows) cobrado[row.month_key] = Number(row.total);

    const allKeys = [...new Set([...Object.keys(facturado), ...Object.keys(cobrado)])].sort();
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const data = allKeys.map(key => {
      const [y, m] = key.split('-');
      return {
        mes: `${monthNames[+m - 1]} ${y}`,
        Facturado: Math.round(facturado[key] || 0),
        Cobrado: Math.round(cobrado[key] || 0)
      };
    });

    res.json({ data });
  } catch (error) {
    console.error('Error al obtener facturado vs cobrado:', error);
    res.status(500).json({ message: 'Error al obtener facturado vs cobrado' });
  }
};

// Top administradores con pagos más rápidos
const getFastPaymentAdmins = async (req, res) => {
  try {
    // Obtener pagos con su documento → factura → servicio → edificio → administrador
    const paymentDocs = await prisma.paymentDocument.findMany({
      where: { invoiceId: { not: null } },
      include: {
        payment: { select: { date: true, amount: true } },
        invoice: {
          select: {
            createdAt: true,
            services: {
              select: {
                building: {
                  select: {
                    administrator: { select: { id: true, name: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    const adminMap = {}; // { adminId: { name, days: [], totalAmount } }

    for (const pd of paymentDocs) {
      if (!pd.payment || !pd.invoice) continue;
      const admin = pd.invoice.services?.[0]?.building?.administrator;
      if (!admin) continue;

      const invoiceDate = new Date(pd.invoice.createdAt);
      const paymentDate = new Date(pd.payment.date);
      const days = Math.max(0, Math.round((paymentDate - invoiceDate) / (1000 * 60 * 60 * 24)));

      if (!adminMap[admin.id]) adminMap[admin.id] = { name: admin.name, days: [], totalAmount: 0 };
      adminMap[admin.id].days.push(days);
      adminMap[admin.id].totalAmount += pd.payment.amount;
    }

    const result = Object.values(adminMap)
      .map(a => ({
        name: a.name,
        promedioDias: Math.round(a.days.reduce((s, d) => s + d, 0) / a.days.length),
        cantidadPagos: a.days.length
      }))
      .filter(a => a.cantidadPagos >= 1)
      .sort((a, b) => a.promedioDias - b.promedioDias)
      .slice(0, 8);

    res.json({ data: result });
  } catch (error) {
    console.error('Error al obtener top admins:', error);
    res.status(500).json({ message: 'Error al obtener top admins' });
  }
};

// Obtener empresas con deudas que superen el umbral de tolerancia
const getBuildingsWithOverdueDebts = async (req, res) => {
  try {
    const now = new Date();

    // Una sola query con CTEs reemplaza el patrón N+1 anterior:
    // 1 CTE calcula la factura impaga más antigua por edificio a nivel DB
    // 1 JOIN final trae todo junto: edificio + cuenta + administrador + fecha más antigua
    const rows = await prisma.$queryRaw`
      WITH unpaid_invoices AS (
        SELECT
          s."buildingId",
          MIN(COALESCE(i.date, i."createdAt")) AS oldest_date
        FROM "Service" s
        JOIN "Invoice" i ON s."invoiceId" = i.id
        LEFT JOIN "PaymentDocument" pd ON pd."invoiceId" = i.id
        GROUP BY s."buildingId", i.id, i.amount
        HAVING COALESCE(SUM(pd.amount), 0) < i.amount
      ),
      oldest_per_building AS (
        SELECT "buildingId", MIN(oldest_date) AS oldest_date
        FROM unpaid_invoices
        GROUP BY "buildingId"
      )
      SELECT
        b.id,
        b.name,
        b.cuit,
        b.address,
        b.locality,
        COALESCE(b."debtThreshold", 30) AS debt_threshold,
        a.balance AS saldo,
        adm.name AS admin_name,
        adm.email AS admin_email,
        adm.phone AS admin_phone,
        opb.oldest_date
      FROM "Building" b
      JOIN "Account" a ON a."buildingId" = b.id
      LEFT JOIN "Administrator" adm ON b."administratorId" = adm.id
      LEFT JOIN oldest_per_building opb ON opb."buildingId" = b.id
      WHERE a.balance > 0
    `;

    const buildings = rows.map(row => {
      const oldestDate = row.oldest_date ? new Date(row.oldest_date) : null;
      const daysOverdue = oldestDate
        ? Math.ceil(Math.abs(now - oldestDate) / (1000 * 60 * 60 * 24))
        : 0;
      const debtThreshold = Number(row.debt_threshold);

      return {
        id: row.id,
        name: row.name,
        cuit: row.cuit,
        address: row.address,
        locality: row.locality,
        debtThreshold,
        currentDebt: Number(row.saldo),
        daysOverdue,
        isOverThreshold: daysOverdue > debtThreshold,
        administrator: {
          name: row.admin_name,
          email: row.admin_email,
          phone: row.admin_phone
        },
        lastInvoiceDate: row.oldest_date
      };
    });

    // Ordenar por días de atraso (mayor a menor)
    buildings.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({
      totalBuildingsWithDebts: buildings.length,
      buildingsOverThreshold: buildings.filter(b => b.isOverThreshold).length,
      buildings
    });

  } catch (error) {
    console.error('Error al obtener edificios con deudas:', error);
    res.status(500).json({ message: 'Error al obtener información de deudas' });
  }
};

module.exports = {
  getQuickStats,
  getBuildingsWithOverdueDebts,
  getPaymentsByMethod,
  getInvoicedVsCollected,
  getFastPaymentAdmins
}; 