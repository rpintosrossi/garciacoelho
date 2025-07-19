const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los administradores
const getAdministrators = async (req, res) => {
  try {
    // Traer todos los administradores y sus edificios con cuentas
    const administrators = await prisma.administrator.findMany({
      include: {
        buildings: {
          include: { account: true, administrator: true }
        }
      }
    });
    // Recalcular el saldo de cada edificio antes de sumar el saldo total
    const adminsWithBalance = await Promise.all(administrators.map(async admin => {
      // Para cada edificio, recalcular el saldo real
      const buildingsWithBalance = await Promise.all(admin.buildings.map(async (building) => {
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
      // Sumar el saldo de todos los edificios recalculados
      const saldoTotal = buildingsWithBalance.reduce((sum, b) => sum + (b.account?.balance || 0), 0);
      return {
        ...admin,
        buildings: buildingsWithBalance,
        saldoTotal
      };
    }));
    res.json(adminsWithBalance);
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
    const { name, email, phone } = req.body;

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
        phone
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
    const { name, email, phone } = req.body;

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
        phone
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
      // Calcular saldo normalmente
      let saldo = 0;
      
      // Sumar todas las facturas y remitos
      for (const inv of invoices) {
        if (inv) saldo += inv.amount;
      }
      for (const rem of remitos) {
        saldo += rem.amount;
      }
      
      // Restar pagos usando el monto original del pago
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
    const { amount, date, paymentMethodId, docsToAssociate, originalAmount, discount, discountReason } = req.body;
    if (!amount || !date || !paymentMethodId || !docsToAssociate || docsToAssociate.length === 0) {
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
    // Asociar documentos
    for (const doc of docsToAssociate) {
      await prisma.paymentDocument.create({
        data: {
          paymentId: pago.id,
          invoiceId: doc.type === 'FACTURA' ? doc.id : null,
          remitoId: doc.type === 'REMITO' ? doc.id : null,
          amount: parseFloat(doc.amount) || 0
        }
      });
    }
    res.status(201).json(pago);
  } catch (error) {
    console.error('Error al registrar pago masivo:', error);
    res.status(500).json({ message: 'Error al registrar pago masivo' });
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
  createAdminMassivePayment
}; 