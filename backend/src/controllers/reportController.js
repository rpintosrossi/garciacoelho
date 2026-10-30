const { PrismaClient, Prisma } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const { dedupeInvoices } = require('../services/buildingBalanceService');
const {
  serviceInvoicesInclude,
  getServiceInvoices
} = require('../utils/serviceInvoiceHelpers');

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
            ...serviceInvoicesInclude,
            remitos: true
          }
        });

        const invoices = dedupeInvoices(services);
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
            const invService = services.find(s => getServiceInvoices(s).some(i => i.id === inv.id));
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
          ...serviceInvoicesInclude,
          remitos: true
        }
      });

      const invoices = dedupeInvoices(services);
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
          const invService = services.find(s => getServiceInvoices(s).some(i => i.id === inv.id));
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
        include: { ...serviceInvoicesInclude, remitos: true }
      });

      const invoices = dedupeInvoices(services);
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
          const invService = services.find(s => getServiceInvoices(s).some(i => i.id === inv.id));
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

// Reporte de estadísticas por motivos de Sin Cobro Económico
const DETAIL_LIMIT = 50; // máximo de servicios por motivo en la respuesta

const getNoChargeStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { status: 'SIN_COBRO' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 1. Conteos agregados directamente en la BD — sin cargar registros
    const [total, withReason, grouped] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.count({ where: { ...where, noChargeReasonId: { not: null } } }),
      prisma.service.groupBy({
        by: ['noChargeReasonId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    const withoutReason = total - withReason;

    // 2. Traer nombres de motivos en una sola query
    const reasonIds = grouped.map(g => g.noChargeReasonId).filter(Boolean);
    const reasonNames = reasonIds.length
      ? await prisma.noChargeReason.findMany({
          where: { id: { in: reasonIds } },
          select: { id: true, name: true }
        })
      : [];
    const reasonNameMap = Object.fromEntries(reasonNames.map(r => [r.id, r.name]));

    // 3. Serie mensual: solo traer createdAt (mínimo de datos) y calcular en un único O(N) pass
    const dateWhere = {
      ...where,
      createdAt: {
        ...(where.createdAt || {}),
        gte: where.createdAt?.gte || new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      }
    };
    const dates = await prisma.service.findMany({
      where: dateWhere,
      select: { createdAt: true }
    });

    const now = new Date();
    const monthBuckets = new Map();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
      monthBuckets.set(key, { mes: label, cantidad: 0 });
    }
    for (const { createdAt } of dates) {
      const d = new Date(createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthBuckets.has(key)) monthBuckets.get(key).cantidad++;
    }
    const monthlySeries = Array.from(monthBuckets.values());

    // 4. Detalles: cargar como máximo DETAIL_LIMIT servicios por motivo
    //    Se hacen queries separadas, una por motivo, con LIMIT — evita un único findMany enorme
    const byReason = await Promise.all(
      grouped.map(async (g) => {
        const count = g._count.id;
        const reasonId = g.noChargeReasonId;
        const reasonName = reasonId ? (reasonNameMap[reasonId] || 'Motivo eliminado') : 'Sin especificar';

        const services = await prisma.service.findMany({
          where: { ...where, noChargeReasonId: reasonId },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            visitDate: true,
            noChargeComment: true,
            building: { select: { id: true, name: true, address: true } },
            technician: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: DETAIL_LIMIT
        });

        return {
          reasonId,
          reasonName,
          count,
          hasMore: count > DETAIL_LIMIT,
          percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
          services: services.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            createdAt: s.createdAt,
            visitDate: s.visitDate,
            noChargeComment: s.noChargeComment,
            buildingId: s.building.id,
            buildingName: s.building.name,
            buildingAddress: s.building.address,
            technicianName: s.technician?.name || null
          }))
        };
      })
    );

    res.json({ total, withReason, withoutReason, byReason, monthlySeries });
  } catch (error) {
    console.error('Error al obtener estadísticas de sin cobro:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};

const BILLING_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BILLING_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const BILLING_SOURCES = {
  AFIP: 'afip',
  IMPORT: 'importadas',
  INFORMAL: 'informales'
};

function billingTodayYmd() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function shiftBillingMonth(ymd, delta) {
  const [year, month] = ymd.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function utcDayStart(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function utcDayEndExclusive(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
}

function monthKeysBetween(startYmd, endYmd) {
  const [startYear, startMonth] = startYmd.split('-').map(Number);
  const [endYear, endMonth] = endYmd.split('-').map(Number);
  const keys = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

function emptyBillingMonth(monthKey) {
  const [year, month] = monthKey.split('-');
  return {
    monthKey,
    mes: `${BILLING_MONTHS[Number(month) - 1]} ${year}`,
    total: 0,
    count: 0,
    afip: 0,
    importadas: 0,
    informales: 0
  };
}

function roundMoney(value) {
  const numeric = value != null && typeof value === 'object' && typeof value.toNumber === 'function'
    ? value.toNumber()
    : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

// Facturación agrupada por mes, con filtro opcional de fechas
const getBillingStats = async (req, res) => {
  try {
    const today = billingTodayYmd();
    const startDate = req.query.startDate || shiftBillingMonth(today, -11);
    const endDate = req.query.endDate || today;

    if (!BILLING_DATE_RE.test(startDate) || !BILLING_DATE_RE.test(endDate)) {
      return res.status(400).json({ message: 'Las fechas deben tener formato AAAA-MM-DD' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: 'La fecha desde no puede ser posterior a la fecha hasta' });
    }

    const keys = monthKeysBetween(startDate, endDate);
    if (keys.length > 120) {
      return res.status(400).json({ message: 'El rango máximo es de 10 años' });
    }

    const rangeStart = utcDayStart(startDate);
    const rangeEnd = utcDayEndExclusive(endDate);

    // Dos rangos indexables (date y createdAt). COALESCE en el WHERE no puede usar índice.
    // El cobrado sale de PaymentDocument: el estado PAGADA casi no se actualiza al registrar un pago.
    const [rows, collectedRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        month_key,
        source,
        status,
        SUM(cantidad)::int AS cantidad,
        SUM(total) AS total
      FROM (
        SELECT
          TO_CHAR(date AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key,
          "emissionSource"::text AS source,
          status::text AS status,
          COUNT(*)::int AS cantidad,
          COALESCE(SUM(COALESCE("impTotal", amount)), 0) AS total
        FROM "Invoice"
        WHERE date >= ${rangeStart}
          AND date < ${rangeEnd}
        GROUP BY 1, 2, 3

        UNION ALL

        SELECT
          TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key,
          "emissionSource"::text AS source,
          status::text AS status,
          COUNT(*)::int AS cantidad,
          COALESCE(SUM(COALESCE("impTotal", amount)), 0) AS total
        FROM "Invoice"
        WHERE date IS NULL
          AND "createdAt" >= ${rangeStart}
          AND "createdAt" < ${rangeEnd}
        GROUP BY 1, 2, 3
      ) billed
      GROUP BY month_key, source, status
    `,
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(cobrado_factura), 0) AS cobrado,
        COALESCE(SUM(GREATEST(total - LEAST(cobrado_factura, total), 0)), 0) AS pendiente
      FROM (
        SELECT
          b.total,
          CASE
            WHEN COALESCE(SUM(pd.amount), 0) > 0 THEN COALESCE(SUM(pd.amount), 0)
            WHEN b.status = 'PAGADA' OR b.payment_method = 'EFECTIVO' THEN b.total
            ELSE 0
          END AS cobrado_factura
        FROM (
          SELECT
            id,
            COALESCE("impTotal", amount) AS total,
            status::text AS status,
            "paymentMethod" AS payment_method
          FROM "Invoice"
          WHERE date >= ${rangeStart}
            AND date < ${rangeEnd}
          UNION ALL
          SELECT
            id,
            COALESCE("impTotal", amount) AS total,
            status::text AS status,
            "paymentMethod" AS payment_method
          FROM "Invoice"
          WHERE date IS NULL
            AND "createdAt" >= ${rangeStart}
            AND "createdAt" < ${rangeEnd}
        ) b
        LEFT JOIN "PaymentDocument" pd ON pd."invoiceId" = b.id
        GROUP BY b.id, b.total, b.status, b.payment_method
      ) per_invoice
    `
    ]);

    const byMonth = new Map(keys.map((key) => [key, emptyBillingMonth(key)]));
    const bySource = {
      AFIP: { total: 0, count: 0 },
      IMPORT: { total: 0, count: 0 },
      INFORMAL: { total: 0, count: 0 }
    };
    const byStatus = {
      PENDIENTE: { total: 0, count: 0 },
      EMITIDA: { total: 0, count: 0 },
      PAGADA: { total: 0, count: 0 }
    };

    let total = 0;
    let count = 0;

    for (const row of rows) {
      const amount = roundMoney(row.total);
      const qty = Number(row.cantidad) || 0;
      total += amount;
      count += qty;

      const month = byMonth.get(row.month_key);
      if (month) {
        month.total = roundMoney(month.total + amount);
        month.count += qty;
        const field = BILLING_SOURCES[row.source];
        if (field) month[field] = roundMoney(month[field] + amount);
      }

      if (bySource[row.source]) {
        bySource[row.source].total = roundMoney(bySource[row.source].total + amount);
        bySource[row.source].count += qty;
      }
      if (byStatus[row.status]) {
        byStatus[row.status].total = roundMoney(byStatus[row.status].total + amount);
        byStatus[row.status].count += qty;
      }
    }

    const monthly = keys.map((key) => byMonth.get(key));
    const monthCount = monthly.length || 1;
    const collected = roundMoney(collectedRows[0]?.cobrado);
    const pending = roundMoney(collectedRows[0]?.pendiente);

    res.json({
      range: { startDate, endDate },
      summary: {
        total: roundMoney(total),
        count,
        averagePerInvoice: count > 0 ? roundMoney(total / count) : 0,
        averagePerMonth: roundMoney(total / monthCount),
        collected,
        pending,
        bySource,
        byStatus
      },
      monthly
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de facturación:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de facturación' });
  }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptyTechBucket() {
  return {
    jobs: 0,
    enCurso: 0,
    sinCobro: 0,
    conRemito: 0,
    facturados: 0,
    remitoTotal: 0,
    invoiced: 0,
    collected: 0,
    unbilled: 0
  };
}

function addTechBucket(target, row) {
  target.jobs += Number(row.jobs) || 0;
  target.enCurso += Number(row.en_curso) || 0;
  target.sinCobro += Number(row.sin_cobro) || 0;
  target.conRemito += Number(row.con_remito) || 0;
  target.facturados += Number(row.facturados) || 0;
  target.remitoTotal = roundMoney(target.remitoTotal + roundMoney(row.remito_total));
  target.invoiced = roundMoney(target.invoiced + roundMoney(row.facturado));
  target.collected = roundMoney(target.collected + roundMoney(row.cobrado));
  target.unbilled = roundMoney(target.unbilled + roundMoney(row.sin_facturar));
}

function withPending(bucket) {
  return {
    ...bucket,
    pending: roundMoney(Math.max(bucket.invoiced - bucket.collected, 0))
  };
}

// Trabajos por técnico y mes. El mes es la visita (o el alta si no hay visita).
// La factura se reparte entre sus servicios según el monto de los remitos.
const getTechnicianStats = async (req, res) => {
  try {
    const today = billingTodayYmd();
    const startDate = req.query.startDate || shiftBillingMonth(today, -11);
    const endDate = req.query.endDate || today;
    const technicianId = typeof req.query.technicianId === 'string' ? req.query.technicianId.trim() : '';

    if (!BILLING_DATE_RE.test(startDate) || !BILLING_DATE_RE.test(endDate)) {
      return res.status(400).json({ message: 'Las fechas deben tener formato AAAA-MM-DD' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: 'La fecha desde no puede ser posterior a la fecha hasta' });
    }
    if (technicianId && !UUID_RE.test(technicianId)) {
      return res.status(400).json({ message: 'El técnico indicado no es válido' });
    }

    const keys = monthKeysBetween(startDate, endDate);
    if (keys.length > 120) {
      return res.status(400).json({ message: 'El rango máximo es de 10 años' });
    }

    const rangeStart = utcDayStart(startDate);
    const rangeEnd = utcDayEndExclusive(endDate);
    const techFilter = technicianId
      ? Prisma.sql`AND s."technicianId" = ${technicianId}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw`
      WITH range_services AS (
        SELECT
          s.id,
          s."technicianId" AS technician_id,
          t.name AS technician_name,
          t.status AS technician_status,
          s.status::text AS status,
          TO_CHAR(COALESCE(s."visitDate", s."createdAt") AT TIME ZONE 'UTC', 'YYYY-MM') AS month_key
        FROM "Service" s
        JOIN technicians t ON t.id = s."technicianId"
        WHERE s."technicianId" IS NOT NULL
          AND (
            (s."visitDate" >= ${rangeStart} AND s."visitDate" < ${rangeEnd})
            OR (
              s."visitDate" IS NULL
              AND s."createdAt" >= ${rangeStart}
              AND s."createdAt" < ${rangeEnd}
            )
          )
          ${techFilter}
      ),
      invoice_ids AS (
        SELECT DISTINCT ivs."invoiceId"
        FROM "InvoiceService" ivs
        WHERE ivs."serviceId" IN (SELECT id FROM range_services)
      ),
      remito_by_service AS (
        SELECT r."serviceId", COALESCE(SUM(r.amount), 0)::float8 AS remito_total
        FROM "Remito" r
        WHERE r."serviceId" IN (
          SELECT id FROM range_services
          UNION
          SELECT ivs."serviceId"
          FROM "InvoiceService" ivs
          WHERE ivs."invoiceId" IN (SELECT "invoiceId" FROM invoice_ids)
        )
        GROUP BY r."serviceId"
      ),
      invoice_services AS (
        SELECT
          ivs."invoiceId",
          ivs."serviceId",
          COALESCE(rb.remito_total, 0)::float8 AS weight
        FROM "InvoiceService" ivs
        LEFT JOIN remito_by_service rb ON rb."serviceId" = ivs."serviceId"
        WHERE ivs."invoiceId" IN (SELECT "invoiceId" FROM invoice_ids)
      ),
      invoice_weights AS (
        SELECT
          "invoiceId",
          SUM(weight)::float8 AS total_weight,
          COUNT(*)::float8 AS service_count
        FROM invoice_services
        GROUP BY "invoiceId"
      ),
      shares AS (
        SELECT
          a."serviceId",
          a."invoiceId",
          CASE
            WHEN w.total_weight > 0 THEN a.weight / w.total_weight
            ELSE 1.0 / NULLIF(w.service_count, 0)
          END AS share
        FROM invoice_services a
        JOIN invoice_weights w ON w."invoiceId" = a."invoiceId"
      ),
      invoice_paid AS (
        SELECT pd."invoiceId", COALESCE(SUM(pd.amount), 0)::float8 AS paid
        FROM "PaymentDocument" pd
        WHERE pd."invoiceId" IN (SELECT "invoiceId" FROM invoice_ids)
        GROUP BY pd."invoiceId"
      ),
      service_invoice_money AS (
        SELECT
          sh."serviceId",
          COALESCE(SUM(COALESCE(i."impTotal", i.amount) * sh.share), 0)::float8 AS facturado,
          COALESCE(SUM(
            (
              CASE
                WHEN COALESCE(ip.paid, 0) > 0 THEN LEAST(COALESCE(ip.paid, 0), COALESCE(i."impTotal", i.amount))
                WHEN i.status::text = 'PAGADA' OR i."paymentMethod" = 'EFECTIVO' THEN COALESCE(i."impTotal", i.amount)
                ELSE 0
              END
            ) * sh.share
          ), 0)::float8 AS cobrado_factura
        FROM shares sh
        JOIN "Invoice" i ON i.id = sh."invoiceId"
        LEFT JOIN invoice_paid ip ON ip."invoiceId" = sh."invoiceId"
        GROUP BY sh."serviceId"
      ),
      remito_paid AS (
        SELECT r."serviceId", COALESCE(SUM(pd.amount), 0)::float8 AS cobrado_remito
        FROM "Remito" r
        JOIN "PaymentDocument" pd ON pd."remitoId" = r.id
        WHERE r."serviceId" IN (SELECT id FROM range_services)
        GROUP BY r."serviceId"
      ),
      service_stats AS (
        SELECT
          rs.id,
          rs.technician_id,
          rs.technician_name,
          rs.technician_status,
          rs.month_key,
          rs.status,
          COALESCE(rb.remito_total, 0)::float8 AS remito_total,
          COALESCE(sim.facturado, 0)::float8 AS facturado,
          CASE
            WHEN GREATEST(COALESCE(sim.facturado, 0), COALESCE(rb.remito_total, 0)) > 0
              THEN LEAST(
                COALESCE(sim.cobrado_factura, 0) + COALESCE(rp.cobrado_remito, 0),
                GREATEST(COALESCE(sim.facturado, 0), COALESCE(rb.remito_total, 0))
              )
            ELSE COALESCE(sim.cobrado_factura, 0) + COALESCE(rp.cobrado_remito, 0)
          END::float8 AS cobrado
        FROM range_services rs
        LEFT JOIN remito_by_service rb ON rb."serviceId" = rs.id
        LEFT JOIN service_invoice_money sim ON sim."serviceId" = rs.id
        LEFT JOIN remito_paid rp ON rp."serviceId" = rs.id
      )
      SELECT
        technician_id,
        technician_name,
        technician_status,
        month_key,
        COUNT(*)::int AS jobs,
        COUNT(*) FILTER (WHERE status IN ('PENDIENTE', 'ASIGNADO'))::int AS en_curso,
        COUNT(*) FILTER (WHERE status = 'SIN_COBRO')::int AS sin_cobro,
        COUNT(*) FILTER (WHERE remito_total > 0.009)::int AS con_remito,
        COUNT(*) FILTER (WHERE facturado > 0.009)::int AS facturados,
        COALESCE(SUM(remito_total), 0)::float8 AS remito_total,
        COALESCE(SUM(facturado), 0)::float8 AS facturado,
        COALESCE(SUM(cobrado), 0)::float8 AS cobrado,
        COALESCE(SUM(
          CASE
            WHEN status = 'SIN_COBRO' THEN 0
            ELSE GREATEST(remito_total - facturado, 0)
          END
        ), 0)::float8 AS sin_facturar
      FROM service_stats
      GROUP BY technician_id, technician_name, technician_status, month_key
      ORDER BY month_key, technician_name
    `;

    const technicians = new Map();
    const byMonth = new Map(keys.map((key) => [key, new Map()]));
    const summary = emptyTechBucket();

    for (const row of rows) {
      if (!keys.includes(row.month_key)) continue;

      addTechBucket(summary, row);

      let tech = technicians.get(row.technician_id);
      if (!tech) {
        tech = {
          id: row.technician_id,
          name: row.technician_name,
          status: row.technician_status,
          ...emptyTechBucket()
        };
        technicians.set(row.technician_id, tech);
      }
      addTechBucket(tech, row);

      const monthBucket = byMonth.get(row.month_key);
      let monthTech = monthBucket.get(row.technician_id);
      if (!monthTech) {
        monthTech = emptyTechBucket();
        monthBucket.set(row.technician_id, monthTech);
      }
      addTechBucket(monthTech, row);
    }

    const technicianList = [...technicians.values()]
      .map(withPending)
      .sort((a, b) => b.jobs - a.jobs || b.invoiced - a.invoiced || a.name.localeCompare(b.name, 'es'));

    const monthly = keys.map((key) => {
      const monthTotals = emptyTechBucket();
      const byTechnician = {};
      for (const [id, bucket] of byMonth.get(key)) {
        const shaped = withPending(bucket);
        byTechnician[id] = shaped;
        monthTotals.jobs += shaped.jobs;
        monthTotals.enCurso += shaped.enCurso;
        monthTotals.sinCobro += shaped.sinCobro;
        monthTotals.conRemito += shaped.conRemito;
        monthTotals.facturados += shaped.facturados;
        monthTotals.remitoTotal = roundMoney(monthTotals.remitoTotal + shaped.remitoTotal);
        monthTotals.invoiced = roundMoney(monthTotals.invoiced + shaped.invoiced);
        monthTotals.collected = roundMoney(monthTotals.collected + shaped.collected);
        monthTotals.unbilled = roundMoney(monthTotals.unbilled + shaped.unbilled);
      }

      const [year, month] = key.split('-');
      return {
        monthKey: key,
        mes: `${BILLING_MONTHS[Number(month) - 1]} ${year}`,
        ...withPending(monthTotals),
        byTechnician
      };
    });

    const shapedSummary = withPending(summary);

    res.json({
      range: { startDate, endDate },
      summary: {
        ...shapedSummary,
        averagePerJob: shapedSummary.jobs > 0
          ? roundMoney(shapedSummary.remitoTotal / shapedSummary.jobs)
          : 0
      },
      technicians: technicianList,
      monthly
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de técnicos:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas de técnicos' });
  }
};

module.exports = {
  getAdminDebtReport,
  getBuildingDebtReport,
  getAdminDebtPDF,
  getNoChargeStats,
  getBillingStats,
  getTechnicianStats
}; 