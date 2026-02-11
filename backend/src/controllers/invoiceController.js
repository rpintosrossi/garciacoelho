const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Obtener todas las facturas
const getAllInvoices = async (req, res) => {
  try {
    const { include } = req.query;
    
    const includeOptions = {};
    if (include === 'service') {
      includeOptions.service = {
        include: {
          building: {
            include: {
              administrator: true
            }
          },
          technician: true,
          remitos: true
        }
      };
    }

    const invoices = await prisma.invoice.findMany({
      include: includeOptions,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(invoices);
  } catch (error) {
    console.error('Error al obtener facturas:', error);
    res.status(500).json({ message: 'Error al obtener facturas' });
  }
};

// Obtener factura por ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            building: {
              include: {
                administrator: true
              }
            },
            technician: true,
            remitos: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error al obtener factura:', error);
    res.status(500).json({ message: 'Error al obtener factura' });
  }
};

// Crear nueva factura
const createInvoice = async (req, res) => {
  try {
    const { serviceId, amount, status = 'PENDIENTE' } = req.body;

    // Verificar que el servicio existe
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    // Verificar que no existe ya una factura para este servicio
    const existingInvoice = await prisma.invoice.findUnique({
      where: { serviceId }
    });

    if (existingInvoice) {
      return res.status(400).json({ message: 'Ya existe una factura para este servicio' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        serviceId,
        amount,
        status
      },
      include: {
        service: {
          include: {
            building: true,
            technician: true
          }
        }
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error al crear factura:', error);
    res.status(500).json({ message: 'Error al crear factura' });
  }
};

// Actualizar factura
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, status } = req.body;

    // Obtener la factura actual para calcular diferencias si es necesario
    const currentInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        paymentDocuments: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!currentInvoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    // Actualizar la factura
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(status !== undefined && { status })
      },
      include: {
        services: {
          include: {
            building: true,
            technician: true
          }
        }
      }
    });

    // Si hay cambio de monto, verificar si debemos actualizar pagos automáticos (EFECTIVO)
    if (amount !== undefined && currentInvoice.paymentMethod === 'EFECTIVO' && currentInvoice.status === 'PAGADA') {
      // Si la factura fue pagada en efectivo automáticamente, actualizamos también el pago asociado
      // Buscamos el pago asociado que sea de tipo efectivo y tenga el mismo monto original
      const cashPaymentDoc = currentInvoice.paymentDocuments.find(pd => 
        pd.payment.method === 'EFECTIVO' && 
        Math.abs(pd.amount - currentInvoice.amount) < 0.01 // Floating point comparison
      );

      if (cashPaymentDoc) {
        // Actualizamos el documento de pago y el pago principal
        await prisma.$transaction([
          prisma.paymentDocument.update({
            where: { id: cashPaymentDoc.id },
            data: { amount: parseFloat(amount) }
          }),
          prisma.payment.update({
            where: { id: cashPaymentDoc.paymentId },
            data: { amount: parseFloat(amount) }
          })
        ]);
        console.log(`[UPDATE INVOICE] Monto actualizado también en el pago asociado ${cashPaymentDoc.paymentId}`);
      }
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ message: 'Error al actualizar factura' });
  }
};

// Eliminar factura
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.invoice.delete({
      where: { id }
    });

    res.json({ message: 'Factura eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar factura:', error);
    res.status(500).json({ message: 'Error al eliminar factura' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
