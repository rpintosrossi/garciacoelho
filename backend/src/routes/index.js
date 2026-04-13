const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const buildingRoutes = require('./buildingRoutes');
const administratorRoutes = require('./administratorRoutes');
const paymentMethodRoutes = require('./paymentMethodRoutes');
const paymentController = require('../controllers/paymentController');
const remitoController = require('../controllers/remitoController');
const serviceRoutes = require('./serviceRoutes');
const technicianRoutes = require('./technicianRoutes');
const clientRoutes = require('./clientRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');
const zoneRoutes = require('./zoneRoutes');
const packageRoutes = require('./packageRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const workshopRoutes = require('./workshops');
const workshopRepairRoutes = require('./workshopRepairs');
const serviceTypeRoutes = require('./serviceTypeRoutes');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/buildings', buildingRoutes);
router.use('/administrators', administratorRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/service-types', serviceTypeRoutes);
router.use('/services', serviceRoutes);
router.use('/technicians', technicianRoutes);
router.use('/clients', clientRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/zones', zoneRoutes);
router.use('/packages', packageRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/categories', categoryRoutes);
router.use('/stock', productRoutes);
router.use('/workshops', workshopRoutes);
router.use('/workshop-repairs', workshopRepairRoutes);
router.post('/payments', paymentController.createPayment);
router.get('/payments', paymentController.getPayments);
router.get('/payments/buildings', paymentController.getBuildingPayments);
router.get('/payments/administrators', paymentController.getAdministratorPayments);
router.patch('/payments/:id/comment', paymentController.updatePaymentComment);
router.post('/remitos', remitoController.createRemito);
router.patch('/remitos/:id', remitoController.updateRemitoDate);

// Endpoint de prueba simple para diagnosticar datos
router.get('/test-data', async (req, res) => {
  try {
    console.log('🧪 [TEST] Verificando datos en la base de datos...');
    
    // Contar facturas
    const invoiceCount = await prisma.invoice.count();
    console.log(`📄 [TEST] Total de facturas: ${invoiceCount}`);
    
    // Contar pagos
    const paymentCount = await prisma.payment.count();
    console.log(`💰 [TEST] Total de pagos: ${paymentCount}`);
    
    // Contar servicios
    const serviceCount = await prisma.service.count();
    console.log(`🔧 [TEST] Total de servicios: ${serviceCount}`);
    
    // Contar remitos
    const remitoCount = await prisma.remito.count();
    console.log(`📋 [TEST] Total de remitos: ${remitoCount}`);
    
    // Obtener TODOS los pagos con sus documentos
    const allPayments = await prisma.payment.findMany({
      include: {
        paymentMethod: true,
        documents: {
          include: {
            remito: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            },
            invoice: true
          }
        }
      }
    });
    
    // Obtener pagos que son "cobros sin factura"
    const paymentsWithoutInvoice = await prisma.payment.findMany({
      where: {
        documents: {
          some: {
            remitoId: {
              not: null
            },
            invoiceId: null
          }
        }
      },
      include: {
        paymentMethod: true,
        documents: {
          where: {
            remitoId: {
              not: null
            },
            invoiceId: null
          },
          include: {
            remito: {
              include: {
                service: {
                  include: {
                    building: {
                      include: {
                        administrator: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    res.json({
      counts: {
        invoices: invoiceCount,
        payments: paymentCount,
        services: serviceCount,
        remitos: remitoCount
      },
      allPayments: allPayments,
      paymentsWithoutInvoice: paymentsWithoutInvoice
    });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ message: 'Error en test', error: error.message });
  }
});

module.exports = router; 