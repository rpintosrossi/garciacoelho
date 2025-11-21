const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getFileUrl } = require('../utils/fileUtils');
const { PDFDocument: PDFLib } = require('pdf-lib');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const https = require('https');
const http = require('http');
const os = require('os');
const { randomBytes } = require('crypto');
const archiver = require('archiver');
const hummus = require('hummus');

// Función para descargar archivo desde S3 o URL
const downloadFile = async (fileUrl) => {
  try {
    // Si es una URL de S3, intentar múltiples métodos
    if (fileUrl.includes('s3.') && fileUrl.includes('amazonaws.com')) {
      const urlParts = new URL(fileUrl);
      const key = urlParts.pathname.substring(1); // Remover el primer /
      const bucket = process.env.AWS_S3_BUCKET || 'garciacoelho';
      
      console.log(`📥 [S3] Intentando descargar: ${key}`);
      
      // Método 1: Intentar descargar directamente (por si el archivo es público)
      try {
        console.log(`🔓 [S3] Método 1: Intentando acceso directo (público)...`);
        const directBuffer = await new Promise((resolve, reject) => {
          https.get(fileUrl, (response) => {
            if (response.statusCode === 200) {
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => resolve(Buffer.concat(chunks)));
              response.on('error', reject);
            } else {
              reject(new Error(`Direct access failed: ${response.statusCode}`));
            }
          }).on('error', reject);
        });
        console.log(`✅ [S3] Archivo descargado directamente (público)`);
        return directBuffer;
      } catch (directError) {
        console.log(`⚠️ [S3] Acceso directo falló: ${directError.message}`);
      }
      
      // Método 2: Intentar con URL pre-firmada
      try {
        console.log(`🔑 [S3] Método 2: Generando URL pre-firmada...`);
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log(`✅ [S3] URL pre-firmada generada`);
        console.log(`🔍 [S3] URL: ${signedUrl.substring(0, 100)}...`);
        
        const signedBuffer = await new Promise((resolve, reject) => {
          https.get(signedUrl, (response) => {
            if (response.statusCode === 200) {
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => resolve(Buffer.concat(chunks)));
              response.on('error', reject);
            } else {
              reject(new Error(`Signed URL failed: ${response.statusCode}`));
            }
          }).on('error', reject);
        });
        console.log(`✅ [S3] Archivo descargado con URL pre-firmada`);
        return signedBuffer;
      } catch (signedError) {
        console.log(`⚠️ [S3] URL pre-firmada falló: ${signedError.message}`);
      }
      
      // Método 3: Intentar con GetObject directamente
      try {
        console.log(`📦 [S3] Método 3: Intentando GetObject directo...`);
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        
        const response = await s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        
        console.log(`✅ [S3] Archivo descargado con GetObject`);
        return Buffer.concat(chunks);
      } catch (getObjectError) {
        console.error(`❌ [S3] GetObject falló: ${getObjectError.message}`);
        throw new Error(`No se pudo descargar el archivo de S3: ${key}`);
      }
    } else {
      // Si es una URL HTTP/HTTPS regular
      console.log(`📥 [HTTP] Descargando archivo desde URL: ${fileUrl}`);
      
      return new Promise((resolve, reject) => {
        const client = fileUrl.startsWith('https') ? https : http;
        
        // Opciones para ignorar errores de certificado SSL (solo para desarrollo/testing)
        const options = fileUrl.startsWith('https') ? {
          rejectUnauthorized: false // Ignorar errores de certificado SSL
        } : {};
        
        const request = client.get(fileUrl, options, (response) => {
          // Seguir redirecciones
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            console.log(`↪️ [HTTP] Redirigiendo a: ${redirectUrl}`);
            return downloadFile(redirectUrl).then(resolve).catch(reject);
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }
          
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        }).on('error', reject);
      });
    }
  } catch (error) {
    console.error(`❌ Error descargando archivo ${fileUrl}:`, error.message);
    throw error;
  }
};

// Función para verificar si un archivo es PDF
const isPDF = (filename) => {
  if (!filename) return false;
  const lowerFilename = filename.toLowerCase();
  return lowerFilename.endsWith('.pdf') || lowerFilename.includes('.pdf');
};

// Función para agregar PDF de remito al documento principal
const addPDFToDocument = (doc, pdfPath, yPosition, maxWidth = 500) => {
  try {
    if (fs.existsSync(pdfPath)) {
      // Agregar el PDF como imagen (primera página)
      doc.image(pdfPath, 70, yPosition, { width: maxWidth });
      return yPosition + maxWidth + 20; // Retornar nueva posición Y
    }
  } catch (error) {
    console.error('Error al agregar PDF al documento:', error);
  }
  return yPosition + 20; // Si falla, solo avanzar un poco
};



// Prisma client is now imported from centralized lib/prisma.js

// Endpoint de prueba para verificar datos
const testData = async (req, res) => {
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
    
    // Obtener pagos que son "Prov"
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
    
    // Obtener algunos ejemplos
    const sampleInvoices = await prisma.invoice.findMany({ 
      take: 3,
      include: {
        services: {
          include: {
            building: {
              include: {
                administrator: true
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
      paymentsWithoutInvoice: paymentsWithoutInvoice,
      samples: {
        invoices: sampleInvoices
      }
    });
  } catch (error) {
    console.error('Error en test:', error);
    res.status(500).json({ message: 'Error en test', error: error.message });
  }
};

// Endpoint de prueba para verificar facturas y métodos de pago
const testInvoices = async (req, res) => {
  try {
    console.log('🧪 [TEST INVOICES] Verificando facturas y métodos de pago...');
    
    // Obtener todas las facturas con sus métodos de pago
    const allInvoices = await prisma.invoice.findMany({
      include: {
        services: {
          include: {
            building: {
              include: {
                administrator: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📄 [TEST INVOICES] Total de facturas: ${allInvoices.length}`);
    
    // Agrupar por método de pago
    const invoicesByMethod = {};
    allInvoices.forEach(invoice => {
      const method = invoice.paymentMethod || 'null';
      if (!invoicesByMethod[method]) {
        invoicesByMethod[method] = [];
      }
      const firstService = invoice.services && invoice.services[0];
      invoicesByMethod[method].push({
        id: invoice.id,
        amount: invoice.amount,
        status: invoice.status,
        administrator: firstService?.building?.administrator?.name || 'N/A',
        building: firstService?.building?.name || 'N/A',
        createdAt: invoice.createdAt
      });
    });
    
    console.log('📊 [TEST INVOICES] Facturas por método de pago:', invoicesByMethod);
    
    res.json({
      totalInvoices: allInvoices.length,
      invoicesByMethod,
      message: 'Para verificar el filtro, revisa los logs del servidor'
    });
  } catch (error) {
    console.error('Error en test de facturas:', error);
    res.status(500).json({ message: 'Error en test de facturas', error: error.message });
  }
};

// Obtener todas las facturas y Prov agrupados por administrador
// NOTA: Los pagos en efectivo de "Prov" NO se incluyen en los paquetes
// porque ya fueron abonados directamente al cliente
const getPackages = async (req, res) => {
  try {
    console.log('🔍 [PACKAGES] Iniciando búsqueda optimizada de paquetes...');
    const startTime = Date.now();
    
    // OPTIMIZACIÓN: Usar consultas paralelas con select específico en lugar de include profundo
    const [invoices, payments] = await Promise.all([
      // Consulta optimizada para facturas
      prisma.invoice.findMany({
        where: {
          OR: [
            { paymentMethod: null },
            { paymentMethod: { not: 'EFECTIVO' } }
          ]
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          paymentMethod: true,
          fileUrl: true,
          services: {
            select: {
              id: true,
              status: true,
              building: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  administrator: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              },
              technician: {
                select: {
                  id: true,
                  name: true
                }
              },
              remitos: {
                select: {
                  id: true,
                  number: true,
                  amount: true,
                  date: true
                }
              }
            }
          },
          paymentDocuments: {
            select: {
              amount: true,
              payment: {
                select: {
                  discount: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      
      // Consulta optimizada para pagos
      prisma.payment.findMany({
        where: {
          documents: {
            some: {
              remitoId: { not: null },
              invoiceId: null
            }
          },
          method: { not: 'EFECTIVO' }
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          comprobante: true,
          originalAmount: true,
          discount: true,
          discountReason: true,
          paymentMethod: {
            select: {
              id: true,
              name: true
            }
          },
          documents: {
            where: {
              remitoId: { not: null },
              invoiceId: null
            },
            select: {
              remito: {
                select: {
                  id: true,
                  number: true,
                  service: {
                    select: {
                      id: true,
                      building: {
                        select: {
                          id: true,
                          name: true,
                          address: true,
                          administrator: {
                            select: {
                              id: true,
                              name: true
                            }
                          }
                        }
                      },
                      technician: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    console.log(`📄 [PACKAGES] Encontradas ${invoices.length} facturas y ${payments.length} pagos en ${Date.now() - startTime}ms`);
    
    // Filtrar facturas que realmente están pendientes (no tienen pagos asociados o pagos insuficientes)
    const pendingInvoices = [];
    
    for (const invoice of invoices) {
      // Calcular el total pagado y descuentos aplicados para esta factura
      let totalPaid = 0;
      let totalDiscounts = 0;
      
      for (const pd of invoice.paymentDocuments) {
        totalPaid += pd.amount;
        if (pd.payment && pd.payment.discount > 0) {
          totalDiscounts += pd.payment.discount;
        }
      }
      
      // El monto acordado es el original menos todos los descuentos aplicados
      const montoAcordado = invoice.amount - totalDiscounts;
      
      // El monto pendiente es: monto acordado a pagar - monto realmente pagado
      const remainingAmount = montoAcordado - totalPaid;
      
      console.log(`📄 [PACKAGES] Factura ${invoice.id}: monto original = ${invoice.amount}, descuentos = ${totalDiscounts}, monto acordado = ${montoAcordado}, pagado = ${totalPaid}, pendiente = ${remainingAmount}`);
      
      // Solo incluir facturas que realmente están pendientes
      if (remainingAmount > 0) {
        // Agregar información del saldo pendiente a la factura
        const invoiceWithBalance = {
          ...invoice,
          remainingAmount: remainingAmount,
          totalPaid: totalPaid,
          totalDiscounts: totalDiscounts,
          montoAcordado: montoAcordado
        };
        pendingInvoices.push(invoiceWithBalance);
        const firstService = invoice.services && invoice.services[0];
        console.log(`📄 [PACKAGES] Factura ${invoice.id}: método de pago = ${invoice.paymentMethod || 'null'}, status = ${invoice.status}, servicio status = ${firstService?.status || 'N/A'}, PENDIENTE`);
      } else {
        console.log(`📄 [PACKAGES] Factura ${invoice.id}: PAGADA COMPLETAMENTE, excluyendo del paquete`);
      }
    }
    
    console.log(`📄 [PACKAGES] Facturas pendientes después del filtro: ${pendingInvoices.length}`);
    
    // Combinar facturas y Prov
    const allTransactions = [
      ...pendingInvoices.map(invoice => {
        const firstService = invoice.services && invoice.services[0];
        if (!firstService) {
          console.log(`⚠️ [PACKAGES] Factura ${invoice.id} sin servicios, saltando`);
          return null;
        }
        return {
          type: (invoice.status === 'PENDIENTE' && firstService.status === 'FACTURADO') ? 'remito_sin_factura' : 'invoice', // Las facturas informales se tratan como remitos sin factura
          id: invoice.id,
          amount: invoice.remainingAmount, // Usar el saldo pendiente en lugar del monto original
          originalAmount: invoice.amount, // Mantener el monto original para referencia
          totalPaid: invoice.totalPaid,
          totalDiscounts: invoice.totalDiscounts,
          montoAcordado: invoice.montoAcordado,
          status: invoice.status,
          createdAt: invoice.createdAt,
          service: firstService,
          building: firstService.building,
          administrator: firstService.building.administrator,
          technician: firstService.technician,
          remitos: firstService.remitos,
          // Información del PDF de la factura
          invoiceFileUrl: invoice.fileUrl,
          hasInvoicePDF: invoice.fileUrl && isPDF(invoice.fileUrl),
          // Para facturas informales, agregar campos de remito sin factura
          ...(invoice.status === 'PENDIENTE' && firstService.status === 'FACTURADO' && {
            comprobante: `REMITO-SIN-FACTURA-${invoice.id.slice(0, 8)}`,
            paymentMethod: { name: 'Cuenta Corriente' }
          })
        };
      }).filter(Boolean),
      ...payments.map(payment => {
        console.log('🔍 [PACKAGES] Procesando pago:', payment.id, payment.comprobante);
        console.log('🔍 [PACKAGES] Documentos del pago:', payment.documents);
        
        // Para Prov, usar el primer remito asociado
        const firstRemito = payment.documents.find(doc => doc.remito)?.remito;
        
        if (!firstRemito) {
          console.log('⚠️ [PACKAGES] Pago sin remito asociado, saltando:', payment.id);
          return null;
        }
        
        const building = firstRemito.service.building;
        const administrator = building.administrator;
        
        const transaction = {
          type: 'payment',
          id: payment.id,
          amount: payment.amount,
          status: 'PAGADO',
          createdAt: payment.createdAt,
          service: firstRemito.service,
          building: building,
          administrator: administrator,
          technician: firstRemito.service.technician,
          remitos: [firstRemito],
          paymentMethod: payment.paymentMethod,
          comprobante: payment.comprobante,
          originalAmount: payment.originalAmount,
          discount: payment.discount,
          discountReason: payment.discountReason
        };
        
        console.log('🔍 [PACKAGES] Transacción creada:', transaction);
        return transaction;
      }).filter(Boolean) // Filtrar transacciones nulas
    ];

    console.log(`📊 [PACKAGES] Total de transacciones: ${allTransactions.length}`);
    console.log('📊 [PACKAGES] Transacciones:', JSON.stringify(allTransactions, null, 2));
    
    res.json(allTransactions);
  } catch (error) {
    console.error('Error al obtener paquetes:', error);
    res.status(500).json({ message: 'Error al obtener paquetes' });
  }
};

 // Descargar paquete de facturas por administrador
 const downloadPackage = async (req, res) => {
   try {
     const { adminId } = req.params;
     const { paymentMethodId } = req.query;
    
    console.log(`📦 [PACKAGES] Descargando paquete para adminId: ${adminId}`);
    console.log(`💳 [PACKAGES] PaymentMethodId recibido: ${paymentMethodId}`);
    
    // Obtener el administrador
    const administrator = await prisma.administrator.findUnique({
      where: { id: adminId }
    });

    if (!administrator) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    // Obtener el método de pago seleccionado
    let selectedPaymentMethod = null;
    if (paymentMethodId) {
      selectedPaymentMethod = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId }
      });
      
      console.log(`💳 [PACKAGES] Método de pago encontrado:`, selectedPaymentMethod);
      
      if (!selectedPaymentMethod) {
        return res.status(404).json({ message: 'Método de pago no encontrado' });
      }
    } else {
      console.log(`⚠️ [PACKAGES] No se recibió paymentMethodId en la query`);
    }

        // Obtener todas las facturas del administrador
    const invoices = await prisma.invoice.findMany({
      where: {
        services: {
          some: {
            building: {
              administratorId: adminId
            }
          }
        },
        // Excluir facturas con método de pago en efectivo (ya fueron abonadas directamente)
        OR: [
          { paymentMethod: null },
          { paymentMethod: { not: 'EFECTIVO' } }
        ]
      },
      include: {
        services: {
          include: {
            building: true,
            technician: true,
            remitos: true
          }
        },
        paymentDocuments: {
          include: {
            payment: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Filtrar facturas que realmente están pendientes
    const pendingInvoices = [];
    
    for (const invoice of invoices) {
      // Calcular el total pagado y descuentos aplicados para esta factura
      let totalPaid = 0;
      let totalDiscounts = 0;
      
      for (const pd of invoice.paymentDocuments) {
        totalPaid += pd.amount;
        if (pd.payment && pd.payment.discount > 0) {
          totalDiscounts += pd.payment.discount;
        }
      }
      
      // El monto acordado es el original menos todos los descuentos aplicados
      const montoAcordado = invoice.amount - totalDiscounts;
      
      // El monto pendiente es: monto acordado a pagar - monto realmente pagado
      const remainingAmount = montoAcordado - totalPaid;
      
      // Solo incluir facturas que realmente están pendientes
      if (remainingAmount > 0) {
        // Agregar información del saldo pendiente a la factura
        const invoiceWithBalance = {
          ...invoice,
          remainingAmount: remainingAmount,
          totalPaid: totalPaid,
          totalDiscounts: totalDiscounts,
          montoAcordado: montoAcordado
        };
        pendingInvoices.push(invoiceWithBalance);
      }
    }
    
    console.log(`📄 [PACKAGES] Facturas pendientes para descarga: ${pendingInvoices.length} de ${invoices.length}`);

    // Obtener Prov del administrador
    // EXCLUIR pagos en efectivo ya que fueron abonados directamente
    const payments = await prisma.payment.findMany({
      where: {
        documents: {
          some: {
            remito: {
              service: {
                building: {
                  administratorId: adminId
                }
              }
            }
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
            include: {
              remito: {
                include: {
                  service: {
                    include: {
                      building: true,
                      technician: true
                    }
                  }
                }
              }
            }
          }
        },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (pendingInvoices.length === 0 && payments.length === 0) {
      return res.status(404).json({ message: 'No hay facturas ni cobros para este administrador' });
    }

    // Calcular totales
    const totalFacturas = pendingInvoices.reduce((sum, inv) => sum + (inv.montoAcordado || inv.amount), 0);
    const totalProv = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const netoTotal = totalFacturas - totalProv;

    // Crear el PDF del paquete
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const packagePdfBuffer = Buffer.concat(chunks);
        
         // Recolectar facturas con sus remitos asociados (nuevo formato)
         const invoicesWithRemitos = [];
         const orphanRemitoPDFs = []; // Remitos sin factura asociada (de pagos)
         
         console.log('🔍 [PACKAGES] Buscando PDFs en remitos y facturas...');
         console.log(`🔍 [PACKAGES] Total de facturas: ${pendingInvoices.length}`);
         console.log(`🔍 [PACKAGES] Total de pagos: ${payments.length}`);
         
         // PDFs de facturas importadas con sus remitos
         for (const invoice of pendingInvoices) {
           console.log(`🔍 [PACKAGES] Procesando factura: ${invoice.id}`);
           console.log(`🔍 [PACKAGES] Factura tiene fileUrl: ${invoice.fileUrl}`);
           
           const invoiceData = {
             invoice: invoice,
             pdfBuffer: null,
             name: `factura_${invoice.number}`,
             remitos: []
           };
           
           // Verificar si la factura tiene un PDF asociado
           if (invoice.fileUrl && isPDF(invoice.fileUrl)) {
             try {
               console.log(`📥 [PACKAGES] Descargando PDF de factura desde: ${invoice.fileUrl}`);
               const pdfBuffer = await downloadFile(invoice.fileUrl);
               invoiceData.pdfBuffer = pdfBuffer;
               console.log(`✅ [PACKAGES] PDF de factura descargado: ${invoice.number}`);
             } catch (error) {
               console.error(`❌ [PACKAGES] Error al descargar PDF de factura ${invoice.fileUrl}:`, error.message);
             }
           }
           
           // PDFs de remitos de facturas - PROCESAR TODOS LOS SERVICIOS
           if (invoice.services && invoice.services.length > 0) {
             console.log(`🔍 [PACKAGES] Factura tiene ${invoice.services.length} servicios`);
             
             for (const service of invoice.services) {
               if (service.remitos && service.remitos.length > 0) {
                 console.log(`🔍 [PACKAGES] Servicio ${service.id} tiene ${service.remitos.length} remitos`);
                 
                 for (const remito of service.remitos) {
                   console.log(`🔍 [PACKAGES] Procesando remito: ${remito.number}`);
                   console.log(`🔍 [PACKAGES] Remito tiene ${remito.receiptImages?.length || 0} archivos`);
                   
                   if (remito.receiptImages && remito.receiptImages.length > 0) {
                     for (const fileUrl of remito.receiptImages) {
                       console.log(`🔍 [PACKAGES] Archivo: ${fileUrl}, ¿Es PDF?: ${isPDF(fileUrl)}`);
                       if (isPDF(fileUrl)) {
                         try {
                           console.log(`📥 [PACKAGES] Descargando PDF de remito desde: ${fileUrl}`);
                           const pdfBuffer = await downloadFile(fileUrl);
                           invoiceData.remitos.push({ 
                             buffer: pdfBuffer, 
                             name: `remito_${remito.number}`,
                             buildingAddress: service.building?.address || 'N/A',
                             remito: remito
                           });
                           console.log(`✅ [PACKAGES] PDF de remito descargado: ${remito.number}`);
                         } catch (error) {
                           console.error(`❌ [PACKAGES] Error al descargar PDF de remito ${fileUrl}:`, error.message);
                         }
                       }
                     }
                   }
                 }
               }
             }
           }
           
           // Solo agregar facturas que tengan PDF
           if (invoiceData.pdfBuffer) {
             invoicesWithRemitos.push(invoiceData);
           }
         }
        
         // PDFs de remitos de Pagos (huérfanos - sin factura asociada)
         for (const payment of payments) {
           console.log(`🔍 [PACKAGES] Procesando pago: ${payment.id}`);
           for (const paymentDoc of payment.documents) {
             if (paymentDoc.remito) {
               const remito = paymentDoc.remito;
               console.log(`🔍 [PACKAGES] Procesando remito de pago: ${remito.number}`);
               console.log(`🔍 [PACKAGES] Remito tiene ${remito.receiptImages?.length || 0} archivos`);
               if (remito.receiptImages && remito.receiptImages.length > 0) {
                 for (const fileUrl of remito.receiptImages) {
                   console.log(`🔍 [PACKAGES] Archivo de pago: ${fileUrl}, ¿Es PDF?: ${isPDF(fileUrl)}`);
                   if (isPDF(fileUrl)) {
                     try {
                       console.log(`📥 [PACKAGES] Descargando PDF de remito de pago desde: ${fileUrl}`);
                       const pdfBuffer = await downloadFile(fileUrl);
                       orphanRemitoPDFs.push({ buffer: pdfBuffer, name: `remito_pago_${remito.number}` });
                       console.log(`✅ [PACKAGES] PDF de remito de pago descargado: ${remito.number}`);
                     } catch (error) {
                       console.error(`❌ [PACKAGES] Error al descargar PDF de remito de pago ${fileUrl}:`, error.message);
                     }
                   }
                 }
               }
             }
           }
         }
        
         // Contar totales para log
         const totalRemitos = invoicesWithRemitos.reduce((sum, inv) => sum + inv.remitos.length, 0) + orphanRemitoPDFs.length;
         console.log(`📄 [PACKAGES] Encontrados ${invoicesWithRemitos.length} facturas con PDFs`);
         console.log(`📄 [PACKAGES] Encontrados ${totalRemitos} PDFs de remitos para incluir`);
        
        // SOLUCIÓN: Usar hummus para desencriptar y luego combinar con pdf-lib
        try {
          // Crear directorio temporal
          const tempDir = path.join(os.tmpdir(), `paquete-${randomBytes(8).toString('hex')}`);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFiles = [];
          
          try {
            // 1. Desencriptar PDFs de facturas y extraer solo la primera página
            const processedInvoices = [];
            
            for (let i = 0; i < invoicesWithRemitos.length; i++) {
              const invoiceData = invoicesWithRemitos[i];
              
              try {
                console.log(`🔓 [PACKAGES] Desencriptando factura: ${invoiceData.name}`);
                
                // Guardar archivo temporal encriptado
                const encryptedPath = path.join(tempDir, `encrypted-invoice-${i}.pdf`);
                const decryptedPath = path.join(tempDir, `decrypted-invoice-${i}.pdf`);
                fs.writeFileSync(encryptedPath, invoiceData.pdfBuffer);
                tempFiles.push(encryptedPath, decryptedPath);
                
                // Desencriptar con hummus usando appendPDFPagesFromPDF
                const pdfWriter = hummus.createWriter(decryptedPath);
                pdfWriter.appendPDFPagesFromPDF(encryptedPath);
                pdfWriter.end();
                
                // Leer el PDF desencriptado y extraer SOLO LA PRIMERA PÁGINA
                const decryptedBuffer = fs.readFileSync(decryptedPath);
                const facturaPdfDoc = await PDFLib.load(decryptedBuffer);
                const totalPages = facturaPdfDoc.getPageCount();
                
                console.log(`📄 [PACKAGES] Factura ${invoiceData.name} tiene ${totalPages} páginas (3 copias)`);
                
                // Crear nuevo PDF con solo la primera página
                const singlePagePdf = await PDFLib.create();
                const [firstPage] = await singlePagePdf.copyPages(facturaPdfDoc, [0]);
                singlePagePdf.addPage(firstPage);
                const singlePageBytes = await singlePagePdf.save();
                
                console.log(`✅ [PACKAGES] Factura desencriptada y reducida a 1 página: ${invoiceData.name}`);
                
                // Desencriptar remitos de esta factura
                const decryptedRemitos = [];
                for (let j = 0; j < invoiceData.remitos.length; j++) {
                  const remitoData = invoiceData.remitos[j];
                  try {
                    console.log(`🔓 [PACKAGES] Desencriptando remito: ${remitoData.name}`);
                    
                    const encryptedRemitoPath = path.join(tempDir, `encrypted-remito-${i}-${j}.pdf`);
                    const decryptedRemitoPath = path.join(tempDir, `decrypted-remito-${i}-${j}.pdf`);
                    fs.writeFileSync(encryptedRemitoPath, remitoData.buffer);
                    tempFiles.push(encryptedRemitoPath, decryptedRemitoPath);
                    
                    const remitoPdfWriter = hummus.createWriter(decryptedRemitoPath);
                    remitoPdfWriter.appendPDFPagesFromPDF(encryptedRemitoPath);
                    remitoPdfWriter.end();
                    
                    const decryptedRemitoBuffer = fs.readFileSync(decryptedRemitoPath);
                    decryptedRemitos.push({
                      name: remitoData.name,
                      buffer: decryptedRemitoBuffer
                    });
                    
                    console.log(`✅ [PACKAGES] Remito desencriptado: ${remitoData.name}`);
                  } catch (error) {
                    console.error(`❌ [PACKAGES] Error al desencriptar remito ${remitoData.name}:`, error.message);
                    // Si falla la desencriptación, usar el buffer original
                    decryptedRemitos.push(remitoData);
                  }
                }
                
                processedInvoices.push({
                  name: invoiceData.name,
                  buffer: Buffer.from(singlePageBytes),
                  remitos: decryptedRemitos
                });
                
              } catch (error) {
                console.error(`❌ [PACKAGES] Error al procesar factura ${invoiceData.name}:`, error.message);
                // Si falla, intentar usar el buffer original (con las 3 páginas)
                processedInvoices.push({
                  name: invoiceData.name,
                  buffer: invoiceData.pdfBuffer,
                  remitos: invoiceData.remitos
                });
              }
            }
            
            // Desencriptar remitos huérfanos (de pagos)
            const decryptedOrphanRemitos = [];
            for (let k = 0; k < orphanRemitoPDFs.length; k++) {
              const remitoData = orphanRemitoPDFs[k];
              try {
                console.log(`🔓 [PACKAGES] Desencriptando remito huérfano: ${remitoData.name}`);
                
                const encryptedPath = path.join(tempDir, `encrypted-orphan-${k}.pdf`);
                const decryptedPath = path.join(tempDir, `decrypted-orphan-${k}.pdf`);
                fs.writeFileSync(encryptedPath, remitoData.buffer);
                tempFiles.push(encryptedPath, decryptedPath);
                
                const pdfWriter = hummus.createWriter(decryptedPath);
                pdfWriter.appendPDFPagesFromPDF(encryptedPath);
                pdfWriter.end();
                
                const decryptedBuffer = fs.readFileSync(decryptedPath);
                decryptedOrphanRemitos.push({
                  name: remitoData.name,
                  buffer: decryptedBuffer
                });
                
                console.log(`✅ [PACKAGES] Remito huérfano desencriptado: ${remitoData.name}`);
              } catch (error) {
                console.error(`❌ [PACKAGES] Error al desencriptar remito huérfano ${remitoData.name}:`, error.message);
                decryptedOrphanRemitos.push(remitoData);
              }
            }
            
            // 2. Ahora combinar todos los PDFs con pdf-lib
            const mergedPdf = await PDFLib.create();
            
            // Agregar el PDF del paquete (resumen)
            console.log(`📦 [PACKAGES] Agregando PDF del paquete...`);
            const packagePdfDoc = await PDFLib.load(packagePdfBuffer);
            const packagePages = await mergedPdf.copyPages(packagePdfDoc, packagePdfDoc.getPageIndices());
            packagePages.forEach((page) => mergedPdf.addPage(page));
            console.log(`✅ [PACKAGES] Paquete agregado: ${packagePages.length} páginas`);
            
            // Agregar PDF del método de pago (DESPUÉS del resumen, ANTES de las facturas)
            if (selectedPaymentMethod) {
              try {
                console.log(`💳 [PACKAGES] Generando PDF de método de pago: ${selectedPaymentMethod.name}`);
                
                // Generar PDF del método de pago dinámicamente
                const paymentDoc = new PDFDocument({ margin: 50, size: 'A4' });
                const paymentChunks = [];
                
                paymentDoc.on('data', chunk => paymentChunks.push(chunk));
                
                await new Promise((resolve) => {
                  paymentDoc.on('end', resolve);
                  
                  // Logo (si existe)
                  const logoPath = path.join(__dirname, '../../public/logo.png');
                  if (fs.existsSync(logoPath)) {
                    paymentDoc.image(logoPath, 205, 30, { width: 200, align: 'center' });
                  }
                  
                  // Cuadro de datos del método de pago - posición fija bien debajo del logo
                  const boxTop = 200;
                  const boxLeft = 80;
                  const boxWidth = 450;
                  const boxHeight = 280;
                  
                  // Dibujar borde del cuadro
                  paymentDoc.rect(boxLeft, boxTop, boxWidth, boxHeight).stroke();
                  
                  // Contenido dentro del cuadro
                  let currentY = boxTop + 30;
                  const labelX = boxLeft + 30;
                  const valueX = boxLeft + 150;
                  const lineHeight = 40;
                  
                  paymentDoc.fontSize(13).fillColor('#000');
                  
                  // Titular
                  paymentDoc.font('Helvetica-Bold').text('Titular:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.titular || 'No especificado', valueX, currentY, { width: 250 });
                  currentY += lineHeight;
                  
                  // Banco
                  paymentDoc.font('Helvetica-Bold').text('Banco:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.banco || 'No especificado', valueX, currentY, { width: 250 });
                  currentY += lineHeight;
                  
                  // Cuenta
                  paymentDoc.font('Helvetica-Bold').text('Cuenta:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.cuenta || 'No especificado', valueX, currentY, { width: 250 });
                  currentY += lineHeight;
                  
                  // CUIT
                  paymentDoc.font('Helvetica-Bold').text('CUIT:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.cuit || 'No especificado', valueX, currentY, { width: 250 });
                  currentY += lineHeight;
                  
                  // CBU
                  paymentDoc.font('Helvetica-Bold').text('CBU:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.cbu || 'No especificado', valueX, currentY, { width: 250 });
                  currentY += lineHeight;
                  
                  // Alias
                  paymentDoc.font('Helvetica-Bold').text('Alias:', labelX, currentY);
                  paymentDoc.font('Helvetica').text(selectedPaymentMethod.alias || 'No especificado', valueX, currentY, { width: 250 });
                  
                  // Mensaje final en recuadro azul
                  const msgBoxTop = boxTop + boxHeight + 40;
                  const msgBoxHeight = 80;
                  
                  // Fondo azul
                  paymentDoc.rect(50, msgBoxTop, 512, msgBoxHeight).fillAndStroke('#1976d2', '#1976d2');
                  
                  // Texto blanco sobre fondo azul
                  paymentDoc.fontSize(13).fillColor('#ffffff').font('Helvetica-Bold')
                    .text('POR FAVOR ENVIAR COMPROBANTE AL E-MAIL O AL WHATSAPP', 50, msgBoxTop + 15, { 
                      align: 'center',
                      width: 512
                    });
                  
                  paymentDoc.fontSize(11).fillColor('#ffffff').font('Helvetica')
                    .text('Mail: garciacoelho@hotmail.com', 50, msgBoxTop + 42, { 
                      align: 'center',
                      width: 512
                    })
                    .text('Whatsapp: 1138341046', 50, msgBoxTop + 58, { 
                      align: 'center',
                      width: 512
                    });
                  
                  // Pie de página
                  paymentDoc.fontSize(9).fillColor('#666').font('Helvetica')
                    .text('Dirección: Av. San Martín 1234, CABA', 50, 770, { 
                      align: 'center',
                      width: 512
                    });
                  
                  paymentDoc.end();
                });
                
                const paymentPdfBuffer = Buffer.concat(paymentChunks);
                console.log(`💳 [PACKAGES] PDF de método de pago generado: ${paymentPdfBuffer.length} bytes`);
                
                // Agregar al merged PDF
                const paymentPdfDoc = await PDFLib.load(paymentPdfBuffer);
                const paymentPages = await mergedPdf.copyPages(paymentPdfDoc, paymentPdfDoc.getPageIndices());
                paymentPages.forEach((page) => mergedPdf.addPage(page));
                console.log(`✅ [PACKAGES] Método de pago agregado: ${paymentPages.length} páginas`);
                
              } catch (error) {
                console.error(`❌ [PACKAGES] Error al agregar método de pago:`, error.message);
                console.error(error.stack);
              }
            } else {
              console.log(`⚠️ [PACKAGES] No se seleccionó método de pago`);
            }
            
            // NUEVO ORDEN: Agregar FACTURA + sus REMITOS de forma intercalada
            console.log(`📦 [PACKAGES] Agregando facturas con sus remitos (formato intercalado)...`);
            
            for (const invoiceData of processedInvoices) {
              try {
                // 1. Agregar la factura (solo 1 página)
                console.log(`📄 [PACKAGES] Agregando factura: ${invoiceData.name}`);
                const facturaPdfDoc = await PDFLib.load(invoiceData.buffer);
                const facturaPages = await mergedPdf.copyPages(facturaPdfDoc, facturaPdfDoc.getPageIndices());
                facturaPages.forEach((page) => mergedPdf.addPage(page));
                console.log(`✅ [PACKAGES] Factura agregada: ${invoiceData.name} (${facturaPages.length} página)`);
                
                // 2. Agregar todos los remitos de esta factura inmediatamente después
                if (invoiceData.remitos && invoiceData.remitos.length > 0) {
                  console.log(`📄 [PACKAGES] Agregando ${invoiceData.remitos.length} remitos de ${invoiceData.name}...`);
                  
                  for (const remitoData of invoiceData.remitos) {
                    try {
                      console.log(`📄 [PACKAGES] Agregando remito: ${remitoData.name}`);
                      const remitoPdfDoc = await PDFLib.load(remitoData.buffer);
                      const remitoPages = await mergedPdf.copyPages(remitoPdfDoc, remitoPdfDoc.getPageIndices());
                      remitoPages.forEach((page) => mergedPdf.addPage(page));
                      console.log(`✅ [PACKAGES] Remito agregado: ${remitoData.name}`);
                    } catch (error) {
                      console.error(`❌ [PACKAGES] Error al agregar remito ${remitoData.name}:`, error.message);
                    }
                  }
                }
                
              } catch (error) {
                console.error(`❌ [PACKAGES] Error al agregar factura ${invoiceData.name}:`, error.message);
              }
            }
            
            // Agregar remitos huérfanos al final (remitos de pagos sin factura asociada)
            if (decryptedOrphanRemitos.length > 0) {
              console.log(`📄 [PACKAGES] Agregando ${decryptedOrphanRemitos.length} remitos huérfanos (de pagos)...`);
              
              for (const remitoData of decryptedOrphanRemitos) {
                try {
                  console.log(`📄 [PACKAGES] Agregando remito huérfano: ${remitoData.name}`);
                  const remitoPdfDoc = await PDFLib.load(remitoData.buffer);
                  const remitoPages = await mergedPdf.copyPages(remitoPdfDoc, remitoPdfDoc.getPageIndices());
                  remitoPages.forEach((page) => mergedPdf.addPage(page));
                  console.log(`✅ [PACKAGES] Remito huérfano agregado: ${remitoData.name}`);
                } catch (error) {
                  console.error(`❌ [PACKAGES] Error al agregar remito huérfano ${remitoData.name}:`, error.message);
                }
              }
            }
            
            // Guardar y enviar
            console.log(`📦 [PACKAGES] Guardando PDF final...`);
            const mergedPdfBytes = await mergedPdf.save();
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=paquete-${administrator.name}-${new Date().toISOString().split('T')[0]}.pdf`);
            res.send(Buffer.from(mergedPdfBytes));
            
            console.log(`✅ [PACKAGES] Paquete enviado exitosamente`);
            
          } finally {
            // Limpiar archivos temporales
            console.log(`🧹 [PACKAGES] Limpiando archivos temporales...`);
            for (const file of tempFiles) {
              try {
                if (fs.existsSync(file)) {
                  fs.unlinkSync(file);
                }
              } catch (err) {
                console.error(`⚠️ [PACKAGES] Error al eliminar archivo temporal:`, err.message);
              }
            }
            
            // Eliminar directorio temporal
            try {
              if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir);
              }
            } catch (err) {
              console.error(`⚠️ [PACKAGES] Error al eliminar directorio temporal:`, err.message);
            }
          }
          
        } catch (error) {
          console.error('❌ [PACKAGES] Error al combinar PDFs:', error);
          console.error(error.stack);
          // Si falla, enviar solo el PDF del paquete
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=paquete-${administrator.name}-${new Date().toISOString().split('T')[0]}.pdf`);
          res.send(packagePdfBuffer);
        }
        
      } catch (error) {
        console.error('❌ [PACKAGES] Error general al generar paquete:', error);
        res.status(500).json({ message: 'Error al generar paquete', error: error.message });
      }
    });

    // ============ PÁGINA 1: RESUMEN DEL PAQUETE ============
    // Logo (si existe)
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 80 });
    }

    // Título y datos del administrador
    doc.fontSize(20).text('FACTURACIÓN', 50, 50, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Administrador: ${administrator.name}`, { align: 'center' });
    doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, { align: 'center' });
    doc.moveDown(2);

    // Tabla de facturas
    doc.fontSize(14).text('Facturas Incluidas', 50);
    doc.moveDown(0.5);

    // Encabezados de tabla
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 220;
    const col3 = 340;
    const col4 = 450;
    
    doc.fontSize(10).fillColor('#666');
    doc.text('Edificio (Dirección)', col1, tableTop);
    doc.text('Fecha', col2, tableTop);
    doc.text('Nº Factura', col3, tableTop);
    doc.text('Importe', col4, tableTop);
    
    // Línea separadora
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(0.5);

    // Filas de facturas
    doc.fillColor('#000');
    for (const invoice of pendingInvoices) {
      const building = invoice.services?.[0]?.building;
      const address = building ? `${building.name || ''} (${building.address || ''})` : 'N/A';
      const fecha = invoice.date ? new Date(invoice.date).toLocaleDateString('es-AR') : 'N/A';
      const numero = invoice.number || 'N/A';
      const importe = `$${(invoice.montoAcordado || invoice.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
      
      const startY = doc.y;
      
      doc.fontSize(9).text(address, col1, startY, { width: 160 });
      doc.text(fecha, col2, startY, { width: 110 });
      doc.text(numero, col3, startY, { width: 100 });
      doc.text(importe, col4, startY, { width: 90, align: 'right' });
      
      doc.moveDown(1.5);
    }

    // Totales
    doc.moveDown();
    doc.fontSize(11).fillColor('#333');
    doc.text(`Total de Facturas: $${totalFacturas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, col4 - 50, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    doc.text(`Total de Prov: -$${totalProv.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, col4 - 50, doc.y, { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#000').font('Helvetica-Bold');
    doc.text(`Neto Total: $${netoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, col4 - 50, doc.y, { align: 'right' });
    doc.font('Helvetica');

    // Remitos incluidos
    doc.moveDown(2);
    doc.fontSize(14).fillColor('#000').text('Remitos Incluidos:', 50);
    doc.moveDown(0.5);
    
    // Recolectar información de remitos (lo haremos después cuando descarguemos los PDFs)
    // Por ahora solo mostramos los servicios
    const remitosInfo = [];
    for (const invoice of pendingInvoices) {
      if (invoice.services) {
        for (const service of invoice.services) {
          if (service.remitos) {
            for (const remito of service.remitos) {
              remitosInfo.push({
                number: remito.number,
                address: service.building?.address || 'N/A'
              });
            }
          }
        }
      }
    }

    doc.fontSize(10);
    for (const remitoInfo of remitosInfo) {
      doc.text(`• Remito Nº ${remitoInfo.number} - ${remitoInfo.address}`, 70);
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar paquete:', error);
    res.status(500).json({ message: 'Error al generar paquete', error: error.message });
  }
};

// Agregar logo (si existe)
const addLogoToDoc = (doc) => {
  const logoPath = path.join(__dirname, '../../public/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 50, { width: 100 });
  }
};

module.exports = {
  testData,
  testInvoices,
  getPackages,
  downloadPackage
};
