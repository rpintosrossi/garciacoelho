const prisma = require('../lib/prisma');
const {
  calculateBalanceFromData,
  getInvoiceRemaining,
  recalculateBuildingBalance,
  dedupeInvoices
} = require('../services/buildingBalanceService');
const {
  serviceInvoicesInclude,
  getServiceInvoices
} = require('../utils/serviceInvoiceHelpers');

// Obtener todos los administradores
const getAdministrators = async (req, res) => {
  try {
    // Verificar si se solicita solo datos básicos para el formulario
    const basicOnly = req.query.basic === 'true';
    const search = req.query.search;
    
    if (basicOnly) {
      // Construir filtro de búsqueda para datos básicos
      let whereClause = {};
      if (search) {
        // Buscar IDs de admins que tengan el search en su array cuits (búsqueda parcial vía SQL raw)
        let cuitsMatchIds = [];
        try {
          const rawResults = await prisma.$queryRaw`
            SELECT id FROM "Administrator"
            WHERE EXISTS (
              SELECT 1 FROM unnest("cuits") AS c
              WHERE c ILIKE ${'%' + search + '%'}
            )
          `;
          cuitsMatchIds = rawResults.map(r => r.id);
        } catch (_) {}

        whereClause = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { cuit: { contains: search, mode: 'insensitive' } },
            ...(cuitsMatchIds.length > 0 ? [{ id: { in: cuitsMatchIds } }] : [])
          ]
        };
      }

      // Para el formulario de edificios, solo necesitamos datos básicos
      const administrators = await prisma.administrator.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cuit: true,
          phones: true,
          phoneNames: true,
          emails: true,
          emailNames: true,
          cuits: true,
          cuitNames: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      return res.json(administrators);
    }

    // Paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construir filtro de búsqueda
    let whereClause = {};
    if (search) {
      // Buscar IDs de admins que tengan el search en su array cuits (búsqueda parcial vía SQL raw)
      let cuitsMatchIds = [];
      try {
        const rawResults = await prisma.$queryRaw`
          SELECT id FROM "Administrator"
          WHERE EXISTS (
            SELECT 1 FROM unnest("cuits") AS c
            WHERE c ILIKE ${'%' + search + '%'}
          )
        `;
        cuitsMatchIds = rawResults.map(r => r.id);
      } catch (_) {}

      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { cuit: { contains: search, mode: 'insensitive' } },
          ...(cuitsMatchIds.length > 0 ? [{ id: { in: cuitsMatchIds } }] : [])
        ]
      };
    }

    // Contar total de administradores
    const total = await prisma.administrator.count({ where: whereClause });
    
    // Obtener administradores con paginación
    const administrators = await prisma.administrator.findMany({
      where: whereClause,
      include: {
        buildings: {
          include: { account: true, administrator: true }
        }
      },
      skip,
      take: limit,
      orderBy: {
        name: 'asc'
      }
    });

    // Usar saldos persistidos en Account (actualizados en pagos / mantenimiento)
    const adminsWithBalance = administrators.map(admin => {
      const totalBalance = admin.buildings.reduce(
        (sum, building) => sum + (building.account?.balance || 0),
        0
      );

      return {
        ...admin,
        saldoTotal: totalBalance
      };
    });

    res.json({
      administrators: adminsWithBalance,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener administradores:', error);
    res.status(500).json({ message: 'Error al obtener administradores' });
  }
};

// Obtener un administrador por ID
const getAdministratorById = async (req, res) => {
  try {
    const { id } = req.params;
    const administrator = await prisma.administrator.findUnique({
      where: { id },
      include: {
        buildings: true
      }
    });

    if (!administrator) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    res.json(administrator);
  } catch (error) {
    console.error('Error al obtener administrador:', error);
    res.status(500).json({ message: 'Error al obtener administrador' });
  }
};

// Crear un nuevo administrador
const createAdministrator = async (req, res) => {
  try {
    const { name, administratorName, email, phone, cuit, phones, phoneNames, emails, emailNames, cuits, cuitNames, officeAddress } = req.body;

    const existingAdministrator = await prisma.administrator.findFirst({
      where: { email }
    });

    if (existingAdministrator) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const administrator = await prisma.administrator.create({
      data: {
        name,
        administratorName: administratorName || null,
        email,
        phone,
        cuit: cuit || null,
        phones: phones || [],
        phoneNames: phoneNames || [],
        emails: emails || [],
        emailNames: emailNames || [],
        cuits: cuits || [],
        cuitNames: cuitNames || [],
        officeAddress: officeAddress || null
      }
    });

    res.status(201).json(administrator);
  } catch (error) {
    console.error('Error al crear administrador:', error);
    res.status(500).json({ message: 'Error al crear administrador' });
  }
};

// Actualizar un administrador
const updateAdministrator = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, administratorName, email, phone, cuit, phones, phoneNames, emails, emailNames, cuits, cuitNames, officeAddress } = req.body;

    const existingAdministrator = await prisma.administrator.findFirst({
      where: {
        email,
        NOT: {
          id
        }
      }
    });

    if (existingAdministrator) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const administrator = await prisma.administrator.update({
      where: { id },
      data: {
        name,
        administratorName,
        email,
        phone,
        cuit: cuit || null,
        phones,
        phoneNames,
        emails,
        emailNames,
        cuits: cuits || [],
        cuitNames: cuitNames || [],
        officeAddress
      }
    });

    res.json(administrator);
  } catch (error) {
    console.error('Error al actualizar administrador:', error);
    res.status(500).json({ message: 'Error al actualizar administrador' });
  }
};

// Eliminar un administrador
const deleteAdministrator = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el administrador tiene edificios asociados
    const buildings = await prisma.building.findMany({
      where: { administratorId: id }
    });

    if (buildings.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el administrador porque tiene edificios asociados' 
      });
    }

    await prisma.administrator.delete({
      where: { id }
    });

    res.json({ message: 'Administrador eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar administrador:', error);
    res.status(500).json({ message: 'Error al eliminar administrador' });
  }
};

// Obtener saldos de todos los edificios de un administrador
const getBuildingsBalances = async (req, res) => {
  try {
    const { id } = req.params;
    const buildings = await prisma.building.findMany({
      where: { administratorId: id },
      include: {
        administrator: true,
        account: true
      },
      orderBy: { name: 'asc' }
    });

    // Saldo persistido (se actualiza en pagos / herramienta de mantenimiento)
    res.json(buildings);
  } catch (error) {
    console.error('Error al obtener saldos de edificios del administrador:', error);
    res.status(500).json({ message: 'Error al obtener saldos de edificios del administrador' });
  }
};

// Obtener facturas y remitos pendientes de todos los edificios de un administrador
const getPendingInvoicesForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const buildings = await prisma.building.findMany({
      where: { administratorId: id },
      select: { id: true, name: true, address: true }
    });

    if (buildings.length === 0) {
      return res.json([]);
    }

    const buildingsById = new Map(buildings.map((b) => [b.id, b]));
    const buildingIds = buildings.map((b) => b.id);

    const services = await prisma.service.findMany({
      where: { buildingId: { in: buildingIds } },
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
      const building = buildingsById.get(service.buildingId);
      if (!building) continue;

      for (const invoice of getServiceInvoices(service)) {
        if (processedInvoices.has(invoice.id)) continue;
        processedInvoices.set(invoice.id, true);

        const montoPendiente = getInvoiceRemaining(invoice, invoice.paymentDocuments || []);

        if (montoPendiente > 0.01) {
          pendientes.push({
            id: invoice.id,
            type: 'FACTURA',
            serviceId: service.id,
            buildingId: building.id,
            buildingName: building.name,
            buildingAddress: building.address,
            description: service.description,
            amount: montoPendiente,
            date: invoice.createdAt
          });
        }
      }

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
            buildingId: building.id,
            buildingName: building.name,
            buildingAddress: building.address,
            description: service.description,
            amount: montoPendiente,
            date: remito.date
          });
        }
      }
    }

    res.json(pendientes);
  } catch (error) {
    console.error('Error al obtener facturas/remitos pendientes del administrador:', error);
    res.status(500).json({ message: 'Error al obtener facturas/remitos pendientes del administrador' });
  }
};

// Registrar un pago masivo para varios edificios/documentos
const createAdminMassivePayment = async (req, res) => {
  try {
    console.log('💰 [MASSIVE PAYMENT] Iniciando pago masivo...');
    console.log('💰 [MASSIVE PAYMENT] Body recibido:', req.body);
    
    const { amount, date, paymentMethodId, docsToAssociate, originalAmount, discount, discountReason, comment } = req.body;
    if (!amount || !date || !paymentMethodId || !docsToAssociate || docsToAssociate.length === 0) {
      console.log('❌ [MASSIVE PAYMENT] Faltan datos obligatorios');
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
    
    // Validar descuento
    const montoOriginal = originalAmount ? parseFloat(originalAmount) : parseFloat(amount);
    const montoDescuento = discount ? parseFloat(discount) : 0;
    const montoFinal = parseFloat(amount);

    // Con descuento, el monto final no puede ser menor a original - descuento;
    // sí puede ser mayor (pago con saldo a favor).
    if (montoDescuento > 0) {
      const esperadoMinimo = Math.round((montoOriginal - montoDescuento) * 100) / 100;
      if (montoFinal + 0.01 < esperadoMinimo) {
        return res.status(400).json({ 
          message: 'El monto final no puede ser menor al monto original menos el descuento.' 
        });
      }
    }
    
    // Validar suma de montos
    const sumaMontos = docsToAssociate.reduce((sum, doc) => sum + (parseFloat(doc.amount) || 0), 0);
    if (sumaMontos > montoFinal + 0.01) {
      return res.status(400).json({ message: 'La suma de los montos aplicados a los documentos no puede superar el monto total del pago.' });
    }
    // Generar número de comprobante simple (timestamp + random)
    const comprobante = `PAGO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
    // Ajustar la fecha a horario de Argentina (UTC-3)
    let paymentDate = new Date(date);
    // Si la fecha viene sin zona horaria (solo YYYY-MM-DD), ajusta a UTC-3
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      paymentDate = new Date(date + 'T00:00:00-03:00');
    }
    // Crear el pago principal
    console.log('💰 [MASSIVE PAYMENT] Creando pago principal...');
    const pago = await prisma.payment.create({
      data: {
        amount: montoFinal,
        originalAmount: montoOriginal,
        discount: montoDescuento,
        discountReason: discountReason || null,
        comment: comment || null,
        date: paymentDate,
        paymentMethodId,
        comprobante,
        method: '',
      }
    });
    console.log('💰 [MASSIVE PAYMENT] Pago creado:', pago.id);
    
    // Asociar documentos
    console.log('💰 [MASSIVE PAYMENT] Asociando documentos...');
    for (const doc of docsToAssociate) {
      console.log('💰 [MASSIVE PAYMENT] Asociando documento:', doc);
      await prisma.paymentDocument.create({
        data: {
          paymentId: pago.id,
          invoiceId: doc.type === 'FACTURA' ? doc.id : null,
          remitoId: doc.type === 'REMITO' ? doc.id : null,
          amount: parseFloat(doc.amount) || 0
        }
      });
    }
    console.log('✅ [MASSIVE PAYMENT] Documentos asociados');

    // Recalcular saldos de los edificios afectados
    const affectedBuildingIds = new Set();
    for (const doc of docsToAssociate) {
      if (doc.type === 'FACTURA') {
        const services = await prisma.service.findMany({
          where: { invoiceServices: { some: { invoiceId: doc.id } } },
          select: { buildingId: true }
        });
        services.forEach(s => affectedBuildingIds.add(s.buildingId));
      } else if (doc.type === 'REMITO') {
        const remito = await prisma.remito.findUnique({
          where: { id: doc.id },
          include: { service: { select: { buildingId: true } } }
        });
        if (remito?.service?.buildingId) {
          affectedBuildingIds.add(remito.service.buildingId);
        }
      }
    }
    for (const buildingId of affectedBuildingIds) {
      await recalculateBuildingBalance(buildingId);
    }

    console.log('✅ [MASSIVE PAYMENT] Pago masivo completado exitosamente');
    res.status(201).json(pago);
  } catch (error) {
    console.error('Error al registrar pago masivo:', error);
    res.status(500).json({ message: 'Error al registrar pago masivo' });
  }
};

// Obtener facturas y pagos de un edificio específico para la cuenta corriente
const getBuildingAccountDetails = async (req, res) => {
  try {
    const { buildingId } = req.params;
    
    // Verificar que el edificio existe
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
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
      where: { buildingId: buildingId },
      include: {
        ...serviceInvoicesInclude,
        technician: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Obtener todas las facturas del edificio (incluyendo las de efectivo)
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
        service: services.find(s => getServiceInvoices(s).some(inv => inv.id === invoice.id)),
        payments: associatedPaymentDocs.map(pd => ({
          ...pd.payment,
          amountApplied: pd.amount
        })),
        totalPaid,
        remaining,
        isEfectivo
      };
      
      return result;
    });

    // Crear un array cronológico de todas las transacciones
    const allTransactions = [];
    
    invoicesWithPayments.forEach(invoice => {
      allTransactions.push({
        ...invoice,
        displayType: 'invoice'
      });
      
      if (!invoice.isEfectivo) {
        invoice.payments.forEach(payment => {
          allTransactions.push({
            id: payment.id,
            type: 'payment',
            amount: payment.amountApplied ?? payment.amount,
            totalAmount: payment.originalAmount || payment.amount,
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

    const { totalInvoiced, totalPaid: totalPayments, totalDiscounts, balance: currentBalance } =
      calculateBalanceFromData(invoices, paymentDocs);
    const totalInvoices = totalInvoiced;

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

module.exports = {
  getAdministrators,
  getAdministratorById,
  createAdministrator,
  updateAdministrator,
  deleteAdministrator,
  getBuildingsBalances,
  getPendingInvoicesForAdmin,
  createAdminMassivePayment,
  getBuildingAccountDetails
}; 