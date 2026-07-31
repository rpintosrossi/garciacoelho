const { PrismaClient } = require('@prisma/client');
const { getFileUrl } = require('../utils/fileUtils');
const {
  invoiceServicesInclude,
  getInvoiceServices,
  withInvoiceServices,
  linkInvoiceToServicesData,
  serviceInvoicesInclude
} = require('../utils/serviceInvoiceHelpers');

const prisma = new PrismaClient();

// Obtener todas las facturas
const getAllInvoices = async (req, res) => {
  try {
    const { include } = req.query;
    
    const includeOptions = {};
    if (include === 'service') {
      Object.assign(includeOptions, invoiceServicesInclude({
        building: {
          include: {
            administrator: true
          }
        },
        technician: true,
        remitos: true
      }));
    }

    const invoices = await prisma.invoice.findMany({
      include: includeOptions,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(invoices.map(withInvoiceServices));
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
      include: invoiceServicesInclude({
        building: {
          include: {
            administrator: true
          }
        },
        technician: true,
        remitos: true
      })
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    res.json(withInvoiceServices(invoice));
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
      where: { id: serviceId },
      include: serviceInvoicesInclude
    });

    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        amount,
        status,
        ...linkInvoiceToServicesData([serviceId])
      },
      include: invoiceServicesInclude({
        building: true,
        technician: true
      })
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: { status: 'FACTURADO' }
    });

    res.status(201).json(withInvoiceServices(invoice));
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
    let fileUrl;

    if (req.file) {
      if (req.file.location) {
        fileUrl = req.file.location;
      } else {
        fileUrl = getFileUrl(req.file.filename);
      }
    }

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
        ...(status !== undefined && { status }),
        ...(fileUrl && { fileUrl })
      },
      include: invoiceServicesInclude({
        building: true,
        technician: true
      })
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

    res.json(withInvoiceServices(invoice));
  } catch (error) {
    console.error('Error al actualizar factura:', error);
    res.status(500).json({ message: 'Error al actualizar factura' });
  }
};

// Eliminar factura
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la factura existe e incluir sus servicios y documentos de pago
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        paymentDocuments: true,
        ...invoiceServicesInclude({
          remitos: true
        })
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    // Bloquear si ya tiene pagos registrados
    if (invoice.paymentDocuments.length > 0) {
      return res.status(400).json({
        message: 'No se puede revertir la factura porque ya tiene pagos registrados. Para anularla, comuníquese con el administrador.'
      });
    }

    const services = getInvoiceServices(invoice);

    const determineRollbackStatus = (service, remainingInvoiceCount) => {
      if (remainingInvoiceCount > 0) return 'FACTURADO';
      if (service.remitos && service.remitos.length > 0) return 'CON_REMITO';
      if (service.technicianId) return 'ASIGNADO';
      return 'PENDIENTE';
    };

    // Transacción: desasociar servicios + eliminar factura
    await prisma.$transaction(async (tx) => {
      for (const service of services) {
        const otherLinks = await tx.invoiceService.count({
          where: {
            serviceId: service.id,
            invoiceId: { not: id }
          }
        });

        await tx.service.update({
          where: { id: service.id },
          data: {
            status: determineRollbackStatus(service, otherLinks)
          }
        });
      }

      // Eliminar la factura (cascade borra InvoiceService)
      await tx.invoice.delete({ where: { id } });
    });

    res.json({ message: 'Factura revertida correctamente. Los servicios volvieron a su estado anterior.' });
  } catch (error) {
    console.error('Error al eliminar/revertir factura:', error);
    res.status(500).json({ message: 'Error al revertir la factura' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
