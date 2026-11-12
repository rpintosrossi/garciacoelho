const { PrismaClient } = require('@prisma/client');
const { getFileUrl } = require('../utils/fileUtils');
const {
  invoiceServicesInclude,
  getInvoiceServices,
  withInvoiceServices,
  linkInvoiceToServicesData,
  serviceInvoicesInclude,
  canEditCashInvoiceAmount
} = require('../utils/serviceInvoiceHelpers');
const { recalculateBuildingBalance } = require('../services/buildingBalanceService');

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
    const changingAmount = amount !== undefined && amount !== null && String(amount).trim() !== '';
    let fileUrl;

    if (req.file) {
      if (req.file.location) {
        fileUrl = req.file.location;
      } else {
        fileUrl = getFileUrl(req.file.filename);
      }
    }

    const currentInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        paymentDocuments: {
          include: {
            payment: true
          }
        },
        invoiceServices: {
          include: {
            service: { select: { buildingId: true } }
          }
        }
      }
    });

    if (!currentInvoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    let newAmount;
    if (changingAmount) {
      newAmount = parseFloat(amount);
      if (!Number.isFinite(newAmount) || newAmount < 0) {
        return res.status(400).json({ message: 'El monto debe ser un número válido mayor o igual a 0' });
      }
      if (!canEditCashInvoiceAmount(currentInvoice)) {
        return res.status(400).json({
          message: 'Solo se puede modificar el monto de facturas en efectivo. Las facturas electrónicas o con archivo adjunto no se pueden editar.'
        });
      }
      // Un cobro en efectivo no pasa a ser una factura adjunta.
      fileUrl = undefined;
    } else if (req.file && (currentInvoice.emissionSource === 'AFIP' || currentInvoice.cae)) {
      return res.status(400).json({ message: 'No se puede modificar una factura electrónica.' });
    }

    const cashDocs = (currentInvoice.paymentDocuments || []).filter(
      (pd) => pd.payment && pd.payment.method === 'EFECTIVO'
    );
    const cashDoc = cashDocs.length
      ? cashDocs.reduce((best, doc) => (
          Math.abs(doc.amount - currentInvoice.amount) < Math.abs(best.amount - currentInvoice.amount) ? doc : best
        ))
      : null;

    const invoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          ...(changingAmount && { amount: newAmount }),
          ...(status !== undefined && { status }),
          ...(fileUrl && { fileUrl })
        },
        include: invoiceServicesInclude({
          building: true,
          technician: true
        })
      });

      if (changingAmount && cashDoc) {
        const previousDocAmount = cashDoc.amount || 0;
        const nextDocAmount = cashDocs.length === 1
          ? newAmount
          : Math.max(0, previousDocAmount + (newAmount - currentInvoice.amount));
        await tx.paymentDocument.update({
          where: { id: cashDoc.id },
          data: { amount: nextDocAmount }
        });
        await tx.payment.update({
          where: { id: cashDoc.paymentId },
          data: { amount: Math.max(0, (cashDoc.payment.amount || 0) - previousDocAmount + nextDocAmount) }
        });
      }

      return updated;
    });

    if (changingAmount) {
      const buildingIds = [...new Set(
        (currentInvoice.invoiceServices || [])
          .map((link) => link.service?.buildingId)
          .filter(Boolean)
      )];
      for (const buildingId of buildingIds) {
        await recalculateBuildingBalance(buildingId);
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
