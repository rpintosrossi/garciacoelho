const prisma = require('../lib/prisma');

// Obtener todos los administradores
const getAdministrators = async (req, res) => {
  try {
    // Verificar si se solicita solo datos básicos para el formulario
    const basicOnly = req.query.basic === 'true';
    
    if (basicOnly) {
      // Para el formulario de edificios, solo necesitamos datos básicos
      const administrators = await prisma.administrator.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phones: true,
          phoneNames: true,
          emails: true,
          emailNames: true
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

    // Contar total de administradores
    const total = await prisma.administrator.count();
    
    // Obtener administradores con paginación
    const administrators = await prisma.administrator.findMany({
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

    const buildingIds = administrators.flatMap(admin => 
      admin.buildings.map(building => building.id)
    );

    // Obtener todos los servicios, facturas y remitos en consultas optimizadas
    const allServices = await prisma.service.findMany({
      where: {
        buildingId: { in: buildingIds }
      },
      include: {
        invoice: true,
        remitos: true
      }
    });

    // Obtener todos los payment documents en una sola consulta
    const allPaymentDocs = await prisma.paymentDocument.findMany({
      where: {
        OR: [
          { invoiceId: { in: allServices.map(s => s.invoice?.id).filter(Boolean) } },
          { remitoId: { in: allServices.flatMap(s => s.remitos.map(r => r.id)) } }
        ]
      },
      include: { payment: true }
    });

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

    // Calcular saldos para cada administrador
    const adminsWithBalance = await Promise.all(administrators.map(async admin => {
      let totalBalance = 0;
      
      // Calcular saldo para cada edificio del administrador
      const buildingsWithBalance = await Promise.all(admin.buildings.map(async (building) => {
        const buildingServices = servicesByBuilding[building.id] || [];
        const invoices = buildingServices.map(s => s.invoice).filter(Boolean);
        const remitos = buildingServices.flatMap(s => s.remitos);

        // Calcular saldo del edificio usando la misma lógica que la cuenta corriente
        let saldo = 0;
        
        // Sumar todas las facturas (como en la cuenta corriente)
        for (const inv of invoices) {
          saldo += inv.amount;
        }
        
        // Restar todos los pagos (como en la cuenta corriente)
        for (const inv of invoices) {
          const paymentDocs = paymentDocsByInvoice[inv.id] || [];
          for (const pd of paymentDocs) {
            const montoOriginalPago = pd.payment.originalAmount || pd.payment.amount;
            saldo -= montoOriginalPago;
          }
        }

        totalBalance += saldo;

        // Actualizar el saldo en la cuenta solo si es diferente
        if (building.account && Math.abs(building.account.balance - saldo) > 0.01) {
          await prisma.account.update({
            where: { buildingId: building.id },
            data: { balance: saldo }
          });
        }

        return {
          ...building,
          account: {
            ...building.account,
            balance: saldo
          }
        };
      }));

      return {
        ...admin,
        buildings: buildingsWithBalance,
        saldoTotal: totalBalance
      };
    }));

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
    const { name, email, phone, phones, phoneNames, emails, emailNames } = req.body;

    const existingAdministrator = await prisma.administrator.findFirst({
      where: { email }
    });

    if (existingAdministrator) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const administrator = await prisma.administrator.create({
      data: {
        name,
        email,
        phone,
        phones: phones || [],
        phoneNames: phoneNames || [],
        emails: emails || [],
        emailNames: emailNames || []
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
    const { name, email, phone, phones, phoneNames, emails, emailNames } = req.body;

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
        email,
        phone,
        phones,
        phoneNames,
        emails,
        emailNames
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
    const { id } = req.params; // id del administrador
    const buildings = await prisma.building.findMany({
      where: { administratorId: id },
      include: {
        administrator: true,
        account: true
      }
    });

    // Calcular el saldo real para cada edificio (igual que getBuildings)
    const buildingsWithBalance = await Promise.all(buildings.map(async (building) => {
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
      // Calcular saldo usando la misma lógica que la cuenta corriente
      let saldo = 0;
      
      // Sumar todas las facturas (como en la cuenta corriente)
      for (const inv of invoices) {
        if (inv) saldo += inv.amount;
      }
      
      // Restar todos los pagos (como en la cuenta corriente)
      for (const pd of paymentDocs) {
        // Solo procesar pagos de facturas (no remitos)
        if (pd.invoiceId) {
          const montoOriginalPago = pd.payment.originalAmount || pd.payment.amount;
          saldo -= montoOriginalPago;
        }
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
    console.error('Error al obtener saldos de edificios del administrador:', error);
    res.status(500).json({ message: 'Error al obtener saldos de edificios del administrador' });
  }
};

// Obtener facturas y remitos pendientes de todos los edificios de un administrador
const getPendingInvoicesForAdmin = async (req, res) => {
  try {
    const { id } = req.params; // id del administrador
    // Buscar todos los edificios del administrador
    const buildings = await prisma.building.findMany({ where: { administratorId: id } });
    let pendientes = [];
    for (const building of buildings) {
      // Buscar servicios del edificio
      const services = await prisma.service.findMany({
        where: { buildingId: building.id },
        include: {
          invoice: true,
          remitos: true
        }
      });
      // Facturas pendientes (monto > suma de pagos asociados)
      for (const service of services) {
        if (service.invoice) {
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
              buildingId: building.id,
              buildingName: building.name,
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
              buildingId: building.id,
              buildingName: building.name,
              description: service.description,
              amount: montoPendiente,
              date: remito.date
            });
          }
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
    
    const { amount, date, paymentMethodId, docsToAssociate, originalAmount, discount, discountReason } = req.body;
    if (!amount || !date || !paymentMethodId || !docsToAssociate || docsToAssociate.length === 0) {
      console.log('❌ [MASSIVE PAYMENT] Faltan datos obligatorios');
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }
    
    // Validar descuento
    const montoOriginal = originalAmount ? parseFloat(originalAmount) : parseFloat(amount);
    const montoDescuento = discount ? parseFloat(discount) : 0;
    const montoFinal = parseFloat(amount);

    if (montoDescuento > 0) {
      if (montoOriginal - montoDescuento !== montoFinal) {
        return res.status(400).json({ 
          message: 'El monto final debe ser igual al monto original menos el descuento.' 
        });
      }
    }
    
    // Validar suma de montos
    const sumaMontos = docsToAssociate.reduce((sum, doc) => sum + (parseFloat(doc.amount) || 0), 0);
    if (sumaMontos > montoFinal) {
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
        invoice: true,
        technician: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Obtener todas las facturas del edificio (incluyendo las de efectivo)
    const invoices = services.map(s => s.invoice).filter(Boolean);
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
      const associatedPayments = paymentDocs
        .filter(pd => pd.invoiceId === invoice.id)
        .map(pd => pd.payment);
      
      // Para facturas con método de pago EFECTIVO, considerar que ya están pagadas
      const isEfectivo = invoice.paymentMethod === 'EFECTIVO';
      const totalPaid = isEfectivo ? invoice.amount : associatedPayments.reduce((sum, p) => sum + (p.originalAmount || p.amount), 0);
      const remaining = isEfectivo ? 0 : invoice.amount - associatedPayments.reduce((sum, p) => sum + (p.originalAmount || p.amount), 0);
      
      const result = {
        id: invoice.id,
        type: 'invoice',
        amount: invoice.amount,
        status: isEfectivo ? 'PAGADO' : invoice.status,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        service: services.find(s => s.invoice?.id === invoice.id),
        payments: associatedPayments,
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
            amount: payment.originalAmount || payment.amount,
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

    // Calcular saldo actual
    const totalInvoices = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPayments = paymentDocs.reduce((sum, pd) => sum + (pd.payment.originalAmount || pd.payment.amount), 0);
    const currentBalance = totalInvoices - totalPayments;

    // DEBUG: Agregar logs para comparar con los listados
    console.log(`🔍 [DEBUG] Cuenta corriente edificio ${building.name} (${buildingId}):`);
    console.log(`  - Facturas: ${invoices.length}, Total: ${totalInvoices}`);
    console.log(`  - Pagos totales: ${totalPayments}`);
    console.log(`  - Saldo calculado: ${currentBalance}`);

    console.log('🔍 [BACKEND] Enviando respuesta final:', {
      totalTransactions: allTransactions.length,
      sampleTransaction: allTransactions[0] ? {
        id: allTransactions[0].id,
        displayType: allTransactions[0].displayType,
        paymentMethod: allTransactions[0].paymentMethod
      } : null
    });
    
    res.json({
      building,
      transactions: allTransactions,
      summary: {
        totalInvoices,
        totalPayments,
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