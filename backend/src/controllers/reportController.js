const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// Reporte de deuda de administradores
const getAdminDebtReport = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener todos los administradores
    const administrators = await prisma.administrator.findMany({
      where,
      include: {
        buildings: {
          include: {
            account: true
          }
        }
      }
    });

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999); // Final del día

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

        // Deduplicate invoices to avoid counting the same invoice multiple times
        const invoiceMap = new Map();
        services.forEach(s => {
          if (s.invoice) {
            invoiceMap.set(s.invoice.id, s.invoice);
          }
        });
        const invoices = Array.from(invoiceMap.values());
        const invoiceIds = invoices.map(inv => inv.id);
        const remitos = services.flatMap(s => s.remitos);
        const remitoIds = remitos.map(r => r.id);

        // Buscar PaymentDocuments asociados
        const paymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0)
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

        // Calcular deuda del edificio
        let buildingDebt = 0;
        const pendingDocuments = [];

        // Facturas pendientes
        for (const inv of invoices) {
          // Filtrar por fecha
          if (start && new Date(inv.date) < start) continue;
          if (end && new Date(inv.date) > end) continue;

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
            const invService = services.find(s => s.invoice?.id === inv.id);
            const serviceDate = invService?.remitos?.[0]?.date || invService?.visitDate || inv.date || inv.createdAt;
            const invoiceLabel = inv.number ? `Nº ${inv.number}` : inv.id.slice(0, 8);
            pendingDocuments.push({
              id: inv.id,
              type: 'FACTURA',
              amount: montoPendiente,
              date: serviceDate,
              description: `${invoiceLabel} - ${invService?.description || 'Factura'}`
            });
          }
        }

        // Remitos pendientes
        for (const rem of remitos) {
          // Filtrar por fecha
          if (start && new Date(rem.date) < start) continue;
          if (end && new Date(rem.date) > end) continue;

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

      // Deduplicate invoices to avoid counting the same invoice multiple times
      const invoiceMap = new Map();
      services.forEach(s => {
        if (s.invoice) {
          invoiceMap.set(s.invoice.id, s.invoice);
        }
      });
      const invoices = Array.from(invoiceMap.values());
      const invoiceIds = invoices.map(inv => inv.id);
      const remitos = services.flatMap(s => s.remitos);
      const remitoIds = remitos.map(r => r.id);

      // Buscar PaymentDocuments asociados
      const paymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0)
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
          const invService = services.find(s => s.invoice?.id === inv.id);
          const serviceDate = invService?.remitos?.[0]?.date || invService?.visitDate || inv.date || inv.createdAt;
          const invoiceLabel = inv.number ? `Nº ${inv.number}` : inv.id.slice(0, 8);
          pendingDocuments.push({
            id: inv.id,
            type: 'FACTURA',
            amount: montoPendiente,
            date: serviceDate,
            description: `${invoiceLabel} - ${invService?.description || 'Factura'}`
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

const getAdminDebtPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const admin = await prisma.administrator.findUnique({
      where: { id },
      include: {
        buildings: {
          include: { account: true }
        }
      }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const pendingItems = [];

    for (const building of admin.buildings) {
      const services = await prisma.service.findMany({
        where: { buildingId: building.id },
        include: { invoice: true, remitos: true }
      });

      const invoiceMap = new Map();
      services.forEach(s => { if (s.invoice) invoiceMap.set(s.invoice.id, s.invoice); });
      const invoices = Array.from(invoiceMap.values());
      const invoiceIds = invoices.map(inv => inv.id);
      const remitos = services.flatMap(s => s.remitos);
      const remitoIds = remitos.map(r => r.id);

      const paymentDocs = (invoiceIds.length > 0 || remitoIds.length > 0)
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

      // Procesar facturas
      for (const inv of invoices) {
        if (start && new Date(inv.date) < start) continue;
        if (end && new Date(inv.date) > end) continue;

        const paymentDocsForInvoice = paymentDocs.filter(pd => pd.invoiceId === inv.id);
        let totalPagado = 0;
        let totalDescuentos = 0;
        for (const pd of paymentDocsForInvoice) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) totalDescuentos += pd.payment.discount;
        }

        const montoAcordado = inv.amount - totalDescuentos;
        const montoPendiente = montoAcordado - totalPagado;

        if (montoPendiente > 0.1) { // Error de redondeo
          const invService = services.find(s => s.invoice?.id === inv.id);
          const serviceDate = invService?.remitos?.[0]?.date || invService?.visitDate || inv.date || inv.createdAt;
          pendingItems.push({
            buildingName: building.name,
            address: building.address || building.name,
            date: serviceDate,
            number: inv.number || 'N/A',
            amount: montoPendiente,
            type: 'Factura'
          });
        }
      }

      // Procesar remitos
      for (const rem of remitos) {
        if (start && new Date(rem.date) < start) continue;
        if (end && new Date(rem.date) > end) continue;

        const paymentDocsForRemito = paymentDocs.filter(pd => pd.remitoId === rem.id);
        let totalPagado = 0;
        let totalDescuentos = 0;
        for (const pd of paymentDocsForRemito) {
          totalPagado += pd.amount;
          if (pd.payment && pd.payment.discount > 0) totalDescuentos += pd.payment.discount;
        }

        const montoAcordado = rem.amount - totalDescuentos;
        const montoPendiente = montoAcordado - totalPagado;

        if (montoPendiente > 0.1) {
          pendingItems.push({
            buildingName: building.name,
            address: building.address || building.name,
            date: rem.date,
            number: rem.remitoStats?.number || 'N/A', // Remito might not have number property directly pending schema, checking safely? Assume logic same as report
            amount: montoPendiente,
            type: 'Remito'
          });
        }
      }
    }

    // Generar PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Resumen_Deuda_${admin.name.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    // Header similar al paquete
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 80 });
    }

    doc.moveDown(5);
    doc.fontSize(14).text(`Administrador: ${admin.name}`, { align: 'center' });
    doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, { align: 'center' });
    if (startDate || endDate) {
       const dStart = startDate ? new Date(startDate).toLocaleDateString('es-AR') : 'Inicio';
       const dEnd = endDate ? new Date(endDate).toLocaleDateString('es-AR') : 'Fin';
       doc.fontSize(10).text(`Período: ${dStart} - ${dEnd}`, { align: 'center' });
    }
    doc.moveDown(2);

    doc.fontSize(14).text('Resumen de Deuda', 50);
    doc.moveDown(2);

    // Tabla
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 220;
    const col3 = 340;
    const col4 = 450;
    
    doc.fontSize(10).fillColor('#666');
    doc.text('Dirección', col1, tableTop);
    doc.text('Fecha', col2, tableTop);
    doc.text('Tipo/Nº', col3, tableTop);
    doc.text('Importe', col4, tableTop);
    
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(2);

    doc.fillColor('#000');
    let totalTotal = 0;

    for (const item of pendingItems) {
      totalTotal += item.amount;
      const startY = doc.y;

      // Checking for page break
      if (startY > 700) {
        doc.addPage();
        doc.moveTo(50, 50).lineTo(550, 50).stroke(); // Line top
        doc.moveDown(2);
      }
      
      doc.fontSize(9).text(item.address, col1, doc.y, { width: 160 });
      doc.text(item.date ? new Date(item.date).toLocaleDateString('es-AR') : 'N/A', col2, doc.y, { width: 110 });
      doc.text(`${item.type === 'Factura' ? 'F' : 'R'} ${item.number}`, col3, doc.y, { width: 100 });
      doc.text(`$${item.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, col4, doc.y, { width: 90, align: 'right' });
      
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.fontSize(13).fillColor('#000').font('Helvetica-Bold');
    doc.text(`Total Deuda: $${totalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, col4 - 50, doc.y, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Error al generar PDF de admin:', error);
    res.status(500).json({ message: 'Error al generar PDF' });
  }
};

module.exports = {
  getAdminDebtReport,
  getBuildingDebtReport,
  getAdminDebtPDF
}; 