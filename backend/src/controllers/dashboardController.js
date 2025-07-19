const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getQuickStats = async (req, res) => {
  try {
    const [totalBuildings, totalAdmins, totalServices, buildings] = await Promise.all([
      prisma.building.count(),
      prisma.administrator.count(),
      prisma.service.count(),
      prisma.building.findMany({
        include: {
          account: true,
        }
      })
    ]);

    // Calcular fechas de inicio y fin de mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Total de pagos registrados este mes
    const pagosMes = await prisma.payment.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    console.log('Pagos este mes:', pagosMes.length, pagosMes.map(p => p.date));
    const totalPagosMes = pagosMes.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Total facturado este mes (facturas + remitos creados este mes)
    const facturasMes = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    const remitosMes = await prisma.remito.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });
    console.log('Facturas este mes:', facturasMes.length, facturasMes.map(f => f.createdAt));
    console.log('Remitos este mes:', remitosMes.length, remitosMes.map(r => r.date));
    const totalFacturadoMes =
      facturasMes.reduce((sum, f) => sum + (f.amount || 0), 0) +
      remitosMes.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Saldos de todos los edificios (facturas + remitos - pagos aplicados)
    let saldoTotalFavor = 0;
    let edificiosSaldoNegativo = 0;
    for (const building of buildings) {
      // Obtener servicios del edificio
      const services = await prisma.service.findMany({
        where: { buildingId: building.id },
        include: { invoice: true, remitos: true }
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
        }
      });
      // Sumar facturas y remitos
      let saldo = 0;
      for (const inv of invoices) {
        if (inv) saldo += inv.amount;
      }
      for (const rem of remitos) {
        saldo += rem.amount;
      }
      // Restar solo los montos aplicados a documentos de este edificio
      for (const pd of paymentDocs) {
        saldo -= pd.amount;
      }
      console.log(`Edificio: ${building.name} | Facturas: ${invoices.length} | Remitos: ${remitos.length} | Pagos: ${paymentDocs.length} | Saldo: ${saldo}`);
      if (saldo > 0) saldoTotalFavor += saldo;
      if (saldo < 0) edificiosSaldoNegativo++;
    }
    console.log('Saldo total a favor:', saldoTotalFavor);
    console.log('Edificios con saldo negativo:', edificiosSaldoNegativo);

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
    console.error('Error al obtener estadísticas rápidas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas rápidas' });
  }
};

module.exports = {
  getQuickStats
}; 