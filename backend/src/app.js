const express = require('express');
const cors = require('cors');
const path = require('path');
const mainRoutes = require('./routes/index');
const initUploads = require('./utils/initUploads');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();

// Middleware para logging optimizado
app.use((req, res, next) => {
  // Solo log en desarrollo y para rutas importantes
  if (process.env.NODE_ENV === 'development') {
    // Solo log para rutas que no sean estáticas o de health check
    if (!req.url.includes('/uploads') && req.url !== '/') {
      console.log(`[SERVER] ${req.method} ${req.url}`);
    }
  }
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos de /uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta de health check para Railway
app.get('/', (req, res) => {
  res.json({ 
    message: 'Garcia Coelho API funcionando correctamente',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de prueba directo para diagnosticar datos
app.get('/test-data', async (req, res) => {
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
    
    // Obtener TODAS las facturas con detalles
    const allInvoices = await prisma.invoice.findMany({
      include: {
        service: {
          include: {
            building: {
              include: {
                administrator: true
              }
            },
            technician: true
          }
        }
      }
    });
    
    // Obtener servicios con remitos para ver cuáles pueden facturarse
    const servicesWithRemitos = await prisma.service.findMany({
      where: {
        remitos: {
          some: {}
        }
      },
      include: {
        building: {
          include: {
            administrator: true
          }
        },
        technician: true,
        remitos: true,
        invoice: true
      }
    });
    
    // Obtener pagos que son "cobros sin factura"
    // EXCLUIR pagos en efectivo ya que fueron abonados directamente
    const paymentsWithoutInvoice = await prisma.payment.findMany({
      where: {
        documents: {
          some: {
            remitoId: {
              not: null
            },
            invoiceId: null
          }
        },
        // Excluir pagos en efectivo (ya fueron abonados directamente)
        method: {
          not: 'EFECTIVO'
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
      allInvoices: allInvoices,
      allPayments: allPayments,
      paymentsWithoutInvoice: paymentsWithoutInvoice,
      servicesWithRemitos: servicesWithRemitos,
      message: 'Para crear un cobro sin factura de prueba, usa POST /api/services/SERVICE_ID/informal-invoice con: { "amount": 1000 }'
    });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ message: 'Error en test', error: error.message });
  }
});

// Rutas
app.use('/api', mainRoutes);

// Inicializar carpeta de uploads
initUploads();

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('[SERVER] Error:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app; 