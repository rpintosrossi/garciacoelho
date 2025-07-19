const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Reporte de deuda de administradores
const getAdminDebtReport = async (req, res) => {
  try {
    // Obtener todos los administradores
    const administrators = await prisma.administrator.findMany({
      include: {
        buildings: {
          include: {
            account: true
          }
        }
      }
    });

    const reports = [];

    for (const admin of administrators) {
      // Calcular deuda total del administrador
      let totalDebt = 0;
      const buildingsWithDebt = [];

      for (const building of admin.buildings) {
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

        // Buscar PaymentDocuments asociados
        const paymentDocs = await prisma.paymentDocument.findMany({
          where: {
            OR: [
              { invoiceId: { in: invoiceIds } },
              { remitoId: { in: remitoIds } }
            ]
          },
          include: { payment: true }
        });

        // Calcular deuda del edificio
        let buildingDebt = 0;
        const pendingDocuments = [];

        // Facturas pendientes
        for (const inv of invoices) {
          const paymentDocsForInvoice = paymentDocs.filter(pd => pd.invoiceId === inv.id);
          let totalPagado = 0;
          let totalDescuentos = 0;

          for (const pd of paymentDocsForInvoice) {
            totalPagado += pd.amount;
            if (pd.payment && pd.payment.discount > 0) {
              totalDescuentos += pd.payment.discount;
            }
          }

          const montoAcordado = inv.amount - totalDescuentos;
          const montoPendiente = montoAcordado - totalPagado;
          if (montoPendiente > 0) {
            buildingDebt += montoPendiente;
            pendingDocuments.push({
              id: inv.id,
              type: 'FACTURA',
              amount: montoPendiente,
              date: inv.createdAt,
              description: services.find(s => s.invoice?.id === inv.id)?.description || 'Factura'
            });
          }
        }

        // Remitos pendientes
        for (const rem of remitos) {
          const paymentDocsForRemito = paymentDocs.filter(pd => pd.remitoId === rem.id);
          let totalPagado = 0;
          let totalDescuentos = 0;

          for (const pd of paymentDocsForRemito) {
            totalPagado += pd.amount;
            if (pd.payment && pd.payment.discount > 0) {
              totalDescuentos += pd.payment.discount;
            }
          }

          const montoAcordado = rem.amount - totalDescuentos;
          const montoPendiente = montoAcordado - totalPagado;
          if (montoPendiente > 0) {
            buildingDebt += montoPendiente;
            pendingDocuments.push({
              id: rem.id,
              type: 'REMITO',
              amount: montoPendiente,
              date: rem.date,
              description: services.find(s => s.remitos.some(r => r.id === rem.id))?.description || 'Remito'
            });
          }
        }

        if (buildingDebt > 0) {
          totalDebt += buildingDebt;
          buildingsWithDebt.push({
            buildingId: building.id,
            buildingName: building.name,
            debt: buildingDebt,
            pendingDocuments
          });
        }
      }

      // Solo incluir administradores con deuda
      if (totalDebt > 0) {
        reports.push({
          administratorId: admin.id,
          administratorName: admin.name,
          administratorEmail: admin.email,
          totalDebt,
          buildings: buildingsWithDebt
        });
      }
    }

    res.json(reports);
  } catch (error) {
    console.error('Error al generar reporte de deuda de administradores:', error);
    res.status(500).json({ message: 'Error al generar reporte de deuda de administradores' });
  }
};

// Reporte de deuda de edificios
const getBuildingDebtReport = async (req, res) => {
  try {
    // Obtener todos los edificios
    const buildings = await prisma.building.findMany({
      include: {
        administrator: true,
        account: true
      }
    });

    const reports = [];

    for (const building of buildings) {
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

      // Buscar PaymentDocuments asociados
      const paymentDocs = await prisma.paymentDocument.findMany({
        where: {
          OR: [
            { invoiceId: { in: invoiceIds } },
            { remitoId: { in: remitoIds } }
          ]
        },
        include: { payment: true }
      });

      // Calcular deuda del edificio
      let totalDebt = 0;
      const pendingDocuments = [];

      // Facturas pendientes
      for (const inv of invoices) {
        const paymentDocsForInvoice = paymentDocs.filter(pd => pd.invoiceId === inv.id);
        let totalPagado = 0;
        let totalDescuentos = 0;

        for (const pd of paymentDocsForInvoice) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) {
            totalDescuentos += pd.payment.discount;
          }
        }

        const montoAcordado = inv.amount - totalDescuentos;
        const montoPendiente = montoAcordado - totalPagado;
        if (montoPendiente > 0) {
          totalDebt += montoPendiente;
          pendingDocuments.push({
            id: inv.id,
            type: 'FACTURA',
            amount: montoPendiente,
            date: inv.createdAt,
            description: services.find(s => s.invoice?.id === inv.id)?.description || 'Factura'
          });
        }
      }

      // Remitos pendientes
      for (const rem of remitos) {
        const paymentDocsForRemito = paymentDocs.filter(pd => pd.remitoId === rem.id);
        let totalPagado = 0;
        let totalDescuentos = 0;

        for (const pd of paymentDocsForRemito) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) {
            totalDescuentos += pd.payment.discount;
          }
        }

        const montoAcordado = rem.amount - totalDescuentos;
        const montoPendiente = montoAcordado - totalPagado;
        if (montoPendiente > 0) {
          totalDebt += montoPendiente;
          pendingDocuments.push({
            id: rem.id,
            type: 'REMITO',
            amount: montoPendiente,
            date: rem.date,
            description: services.find(s => s.remitos.some(r => r.id === rem.id))?.description || 'Remito'
          });
        }
      }

      // Solo incluir edificios con deuda
      if (totalDebt > 0) {
        reports.push({
          buildingId: building.id,
          buildingName: building.name,
          buildingAddress: building.address,
          administratorName: building.administrator.name,
          administratorEmail: building.administrator.email,
          totalDebt,
          pendingDocuments
        });
      }
    }

    res.json(reports);
  } catch (error) {
    console.error('Error al generar reporte de deuda de edificios:', error);
    res.status(500).json({ message: 'Error al generar reporte de deuda de edificios' });
  }
};

module.exports = {
  getAdminDebtReport,
  getBuildingDebtReport
}; 