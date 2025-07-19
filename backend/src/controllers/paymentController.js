const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Registrar un pago y asociar a facturas o remitos
const createPayment = async (req, res) => {
  try {
    const { 
      amount, 
      date, 
      paymentMethodId, 
      docsToAssociate, 
      originalAmount, 
      discount, 
      discountReason 
    } = req.body;
    
    if (!amount || !date || !paymentMethodId) {
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

    // Validar suma de montos si hay documentos asociados
    if (docsToAssociate && docsToAssociate.length > 0) {
      const sumaMontos = docsToAssociate.reduce((sum, doc) => sum + (parseFloat(doc.amount) || 0), 0);
      if (sumaMontos > montoFinal) {
        return res.status(400).json({ 
          message: 'La suma de los montos aplicados a los documentos no puede superar el monto total del pago.' 
        });
      }
    }

    // Generar número de comprobante simple (timestamp + random)
    const comprobante = `PAGO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;

    // Crear el pago principal
    const pago = await prisma.payment.create({
      data: {
        amount: montoFinal,
        originalAmount: montoOriginal,
        discount: montoDescuento,
        discountReason: discountReason || null,
        date: new Date(date),
        paymentMethodId,
        comprobante,
        method: '',
      }
    });

    // Asociar documentos con sus montos específicos
    if (docsToAssociate && docsToAssociate.length > 0) {
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
    }

    res.status(201).json(pago);
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ message: 'Error al registrar pago' });
  }
};

// Obtener todos los pagos con información de descuentos
const getPayments = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        paymentMethod: true,
        documents: {
          include: {
            invoice: {
              include: {
                service: {
                  include: {
                    building: true
                  }
                }
              }
            },
            remito: {
              include: {
                service: {
                  include: {
                    building: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Formatear respuesta con información de descuentos
    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      originalAmount: payment.originalAmount,
      discount: payment.discount,
      discountReason: payment.discountReason,
      date: payment.date,
      method: payment.method,
      comprobante: payment.comprobante,
      paymentMethod: payment.paymentMethod,
      documents: payment.documents,
      hasDiscount: payment.discount > 0,
      discountPercentage: payment.originalAmount ? 
        ((payment.discount / payment.originalAmount) * 100).toFixed(2) : 0
    }));

    res.json(formattedPayments);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ message: 'Error al obtener pagos' });
  }
};

module.exports = { createPayment, getPayments }; 