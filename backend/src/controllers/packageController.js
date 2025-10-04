const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getFileUrl } = require('../utils/fileUtils');
const { PDFDocument: PDFLib } = require('pdf-lib');

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
        service: {
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
      invoicesByMethod[method].push({
        id: invoice.id,
        amount: invoice.amount,
        status: invoice.status,
        administrator: invoice.service.building.administrator.name,
        building: invoice.service.building.name,
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
          service: {
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
        console.log(`📄 [PACKAGES] Factura ${invoice.id}: método de pago = ${invoice.paymentMethod || 'null'}, status = ${invoice.status}, servicio status = ${invoice.service.status}, PENDIENTE`);
      } else {
        console.log(`📄 [PACKAGES] Factura ${invoice.id}: PAGADA COMPLETAMENTE, excluyendo del paquete`);
      }
    }
    
    console.log(`📄 [PACKAGES] Facturas pendientes después del filtro: ${pendingInvoices.length}`);
    
    // Combinar facturas y Prov
    const allTransactions = [
      ...pendingInvoices.map(invoice => ({
        type: (invoice.status === 'PENDIENTE' && invoice.service.status === 'FACTURADO') ? 'remito_sin_factura' : 'invoice', // Las facturas informales se tratan como remitos sin factura
        id: invoice.id,
        amount: invoice.remainingAmount, // Usar el saldo pendiente en lugar del monto original
        originalAmount: invoice.amount, // Mantener el monto original para referencia
        totalPaid: invoice.totalPaid,
        totalDiscounts: invoice.totalDiscounts,
        montoAcordado: invoice.montoAcordado,
        status: invoice.status,
        createdAt: invoice.createdAt,
        service: invoice.service,
        building: invoice.service.building,
        administrator: invoice.service.building.administrator,
        technician: invoice.service.technician,
        remitos: invoice.service.remitos,
        // Información del PDF de la factura
        invoiceFileUrl: invoice.fileUrl,
        hasInvoicePDF: invoice.fileUrl && isPDF(invoice.fileUrl),
        // Para facturas informales, agregar campos de remito sin factura
        ...(invoice.status === 'PENDIENTE' && invoice.service.status === 'FACTURADO' && {
          comprobante: `REMITO-SIN-FACTURA-${invoice.id.slice(0, 8)}`,
          paymentMethod: { name: 'Cuenta Corriente' }
        })
      })),
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
      
      if (!selectedPaymentMethod) {
        return res.status(404).json({ message: 'Método de pago no encontrado' });
      }
    }

        // Obtener todas las facturas del administrador
    const invoices = await prisma.invoice.findMany({
      where: {
        service: {
          building: {
            administratorId: adminId
          }
        },
        // Excluir facturas con método de pago en efectivo (ya fueron abonadas directamente)
        OR: [
          { paymentMethod: null },
          { paymentMethod: { not: 'EFECTIVO' } }
        ]
      },
      include: {
        service: {
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

    // Crear el PDF del paquete
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', async () => {
      try {
        const packagePdfBuffer = Buffer.concat(chunks);
        
                 // Recolectar todos los PDFs de remitos y facturas
         const remitoPDFs = [];
         const invoicePDFs = [];
         
         console.log('🔍 [PACKAGES] Buscando PDFs en remitos y facturas...');
         console.log(`🔍 [PACKAGES] Total de facturas: ${pendingInvoices.length}`);
         console.log(`🔍 [PACKAGES] Total de pagos: ${payments.length}`);
         
         // PDFs de facturas importadas
         for (const invoice of pendingInvoices) {
           console.log(`🔍 [PACKAGES] Procesando factura: ${invoice.id}`);
           console.log(`🔍 [PACKAGES] Factura tiene fileUrl: ${invoice.fileUrl}`);
           
           // Verificar si la factura tiene un PDF asociado
           if (invoice.fileUrl && isPDF(invoice.fileUrl)) {
             // Extraer el nombre del archivo de la URL completa
             const filename = invoice.fileUrl.split('/').pop(); // Obtiene el último segmento de la URL
             const filePath = path.join(__dirname, '../../uploads', filename);
             console.log(`🔍 [PACKAGES] URL de factura: ${invoice.fileUrl}`);
             console.log(`🔍 [PACKAGES] Nombre del archivo de factura: ${filename}`);
             console.log(`🔍 [PACKAGES] Ruta del archivo de factura: ${filePath}`);
             console.log(`🔍 [PACKAGES] ¿Existe el archivo de factura?: ${fs.existsSync(filePath)}`);
             if (fs.existsSync(filePath)) {
               invoicePDFs.push(filePath);
               console.log(`✅ [PACKAGES] PDF de factura agregado: ${filePath}`);
             }
           }
           
           // PDFs de remitos de facturas
           if (invoice.service.remitos && invoice.service.remitos.length > 0) {
             console.log(`🔍 [PACKAGES] Factura tiene ${invoice.service.remitos.length} remitos`);
             for (const remito of invoice.service.remitos) {
               console.log(`🔍 [PACKAGES] Procesando remito: ${remito.number}`);
               console.log(`🔍 [PACKAGES] Remito tiene ${remito.receiptImages?.length || 0} archivos`);
               if (remito.receiptImages && remito.receiptImages.length > 0) {
                 for (const fileUrl of remito.receiptImages) {
                   console.log(`🔍 [PACKAGES] Archivo: ${fileUrl}, ¿Es PDF?: ${isPDF(fileUrl)}`);
                   if (isPDF(fileUrl)) {
                     // Extraer el nombre del archivo de la URL completa
                     const filename = fileUrl.split('/').pop(); // Obtiene el último segmento de la URL
                     const filePath = path.join(__dirname, '../../uploads', filename);
                     console.log(`🔍 [PACKAGES] URL original: ${fileUrl}`);
                     console.log(`🔍 [PACKAGES] Nombre del archivo extraído: ${filename}`);
                     console.log(`🔍 [PACKAGES] Ruta del archivo: ${filePath}`);
                     console.log(`🔍 [PACKAGES] ¿Existe el archivo?: ${fs.existsSync(filePath)}`);
                     if (fs.existsSync(filePath)) {
                       remitoPDFs.push(filePath);
                       console.log(`✅ [PACKAGES] PDF agregado: ${filePath}`);
                     }
                   }
                 }
               }
             }
           }
         }
        
                 // PDFs de remitos de Prov
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
                     // Extraer el nombre del archivo de la URL completa
                     const filename = fileUrl.split('/').pop(); // Obtiene el último segmento de la URL
                     const filePath = path.join(__dirname, '../../uploads', filename);
                     console.log(`🔍 [PACKAGES] URL original de pago: ${fileUrl}`);
                     console.log(`🔍 [PACKAGES] Nombre del archivo de pago extraído: ${filename}`);
                     console.log(`🔍 [PACKAGES] Ruta del archivo de pago: ${filePath}`);
                     console.log(`🔍 [PACKAGES] ¿Existe el archivo de pago?: ${fs.existsSync(filePath)}`);
                     if (fs.existsSync(filePath)) {
                       remitoPDFs.push(filePath);
                       console.log(`✅ [PACKAGES] PDF de pago agregado: ${filePath}`);
                     }
                   }
                 }
               }
             }
           }
         }
        
                 console.log(`📄 [PACKAGES] Encontrados ${remitoPDFs.length} PDFs de remitos para incluir`);
                 console.log(`📄 [PACKAGES] Encontrados ${invoicePDFs.length} PDFs de facturas para incluir`);
         
         // Verificar qué archivos hay en la carpeta uploads
         const uploadsPath = path.join(__dirname, '../../uploads');
         console.log(`🔍 [PACKAGES] Verificando carpeta uploads: ${uploadsPath}`);
         if (fs.existsSync(uploadsPath)) {
           const files = fs.readdirSync(uploadsPath);
           console.log(`🔍 [PACKAGES] Archivos en uploads:`, files);
         } else {
           console.log(`❌ [PACKAGES] La carpeta uploads no existe`);
         }
        
        // Combinar el PDF del paquete con los PDFs de remitos y facturas
        const mergedPdf = await PDFLib.create();
        
        // Agregar el PDF del paquete
        const packagePdfDoc = await PDFLib.load(packagePdfBuffer);
        const packagePages = await mergedPdf.copyPages(packagePdfDoc, packagePdfDoc.getPageIndices());
        packagePages.forEach((page) => mergedPdf.addPage(page));
        
        // Agregar los PDFs de facturas primero (para que aparezcan antes que los remitos)
        for (const pdfPath of invoicePDFs) {
          try {
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFLib.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));
            console.log(`📄 [PACKAGES] Agregado PDF de factura: ${path.basename(pdfPath)}`);
          } catch (error) {
            console.error(`❌ [PACKAGES] Error al agregar PDF de factura ${pdfPath}:`, error);
          }
        }
        
        // Agregar los PDFs de remitos
        for (const pdfPath of remitoPDFs) {
          try {
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFLib.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => mergedPdf.addPage(page));
            console.log(`📄 [PACKAGES] Agregado PDF de remito: ${path.basename(pdfPath)}`);
          } catch (error) {
            console.error(`❌ [PACKAGES] Error al agregar PDF de remito ${pdfPath}:`, error);
          }
        }
        
        // Generar el PDF final
        const mergedPdfBytes = await mergedPdf.save();
        
        // Enviar el PDF combinado
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=paquete-${administrator.name}-${new Date().toISOString().split('T')[0]}.pdf`);
        res.send(Buffer.from(mergedPdfBytes));
        
      } catch (error) {
        console.error('Error al combinar PDFs:', error);
        // Si falla la combinación, enviar solo el PDF del paquete
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=paquete-${administrator.name}-${new Date().toISOString().split('T')[0]}.pdf`);
        res.send(packagePdfBuffer);
      }
    });

    // Agregar logo (si existe)
    const logoPath = path.join(__dirname, '../../public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    }

         // Datos de la empresa
     doc.fontSize(12)
        .text('Garcia Coelho', 50, 160)
        .fontSize(10)
        .text('Av. Pte Illia 1823, San Martin', 50, 180)
        .text('4753-2393 | 4755-9908', 50, 195);

     // Datos de pago según el método seleccionado
     let paymentInfo = '';
     if (selectedPaymentMethod) {
       paymentInfo = `Datos para ${selectedPaymentMethod.name}:`;
       
       if (selectedPaymentMethod.titular) {
         paymentInfo += `\nTitular: ${selectedPaymentMethod.titular}`;
       }
       if (selectedPaymentMethod.banco) {
         paymentInfo += `\nBanco: ${selectedPaymentMethod.banco}`;
       }
       if (selectedPaymentMethod.cuenta) {
         paymentInfo += `\nCuenta: ${selectedPaymentMethod.cuenta}`;
       }
       if (selectedPaymentMethod.cuit) {
         paymentInfo += `\nCUIT: ${selectedPaymentMethod.cuit}`;
       }
       if (selectedPaymentMethod.cbu) {
         paymentInfo += `\nCBU: ${selectedPaymentMethod.cbu}`;
       }
       if (selectedPaymentMethod.alias) {
         paymentInfo += `\nAlias: ${selectedPaymentMethod.alias}`;
       }
       
       // Agregar información de contacto
       paymentInfo += `\n\nPor favor enviar comprobante al e-mail o al Whatsapp:
Mail: garciacoelho@hotmail.com
Whatsapp: 1138341046`;
     } else {
       // Fallback si no hay método de pago seleccionado
       paymentInfo = `Datos para Transferencia Bancaria:
Banco: Banco de la Nación Argentina
Tipo de Cuenta: Cuenta Corriente
Número de Cuenta: 1234567890
CBU: 0110123456789012345678
Titular: Garcia Coelho S.R.L.
CUIT: 30-12345678-9`;
     }

         // Información del administrador
     doc.fontSize(14)
        .text(`Administrador: ${administrator.name}`, 50, 230)
        .fontSize(10)
        .text(`Fecha de descarga: ${new Date().toLocaleDateString('es-AR')}`, 50, 250);

     // Agregar datos de pago
     const paymentLines = paymentInfo.split('\n');
     let paymentY = 280;
     doc.fontSize(10).text('DATOS PARA PAGO:', 50, paymentY);
     paymentY += 15;
     
     paymentLines.forEach(line => {
       if (line.trim()) {
         doc.fontSize(9).text(line.trim(), 50, paymentY);
         paymentY += 12;
       }
     });

         // Línea separadora
     doc.moveTo(50, paymentY + 10)
        .lineTo(550, paymentY + 10)
        .stroke();

     // Tabla de facturas y cobros
     let yPosition = paymentY + 30;
    let totalAmount = 0;
    let totalInvoices = pendingInvoices.length;
    let totalPayments = payments.length;

    // Encabezados de la tabla
    doc.fontSize(10)
       .text('Edificio (Dirección)', 50, yPosition)
       .text('Fecha', 250, yPosition)
       .text('N° Factura/Comprobante', 350, yPosition)
       .text('Importe', 450, yPosition);

    yPosition += 20;

    // Línea de encabezados
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    yPosition += 10;

    // Datos de las facturas
    for (const invoice of pendingInvoices) {
      const building = invoice.service.building;
      const buildingInfo = `${building.name} (${building.address})`;
      const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('es-AR');
      const invoiceNumber = invoice.id.slice(0, 8);
      const amount = invoice.remainingAmount; // Usar el saldo pendiente

      totalAmount += amount;

      // Verificar si hay espacio suficiente en la página
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(9)
         .text(buildingInfo, 50, yPosition, { width: 180 })
         .text(invoiceDate, 250, yPosition, { width: 80 })
         .text(invoiceNumber, 350, yPosition, { width: 80 })
         .text(`$${amount.toFixed(2)}`, 450, yPosition, { width: 80 });

      yPosition += 15;
    }

    // Datos de los Prov
    for (const payment of payments) {
      const firstRemito = payment.documents.find(doc => doc.remito)?.remito;
      if (firstRemito) {
        const building = firstRemito.service.building;
        const buildingInfo = `${building.name} (${building.address})`;
        const paymentDate = new Date(payment.createdAt).toLocaleDateString('es-AR');
        const comprobante = payment.comprobante;
        const amount = payment.amount;

        totalAmount += amount;

        // Verificar si hay espacio suficiente en la página
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.fontSize(9)
           .text(buildingInfo, 50, yPosition, { width: 180 })
           .text(paymentDate, 250, yPosition, { width: 80 })
           .text(comprobante, 350, yPosition, { width: 80 })
           .text(`$${amount.toFixed(2)}`, 450, yPosition, { width: 80 });

        yPosition += 15;
      }
    }

    // Línea separadora antes del resumen
    yPosition += 10;
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    yPosition += 20;

         // Resumen
     doc.fontSize(12)
        .text(`Total de Facturas: ${totalInvoices}`, 50, yPosition)
        .text(`Total de Prov: ${totalPayments}`, 50, yPosition + 15)
        .text(`Neto Total: $${totalAmount.toFixed(2)}`, 350, yPosition, { width: 200 });

    // Agregar remitos al final
    yPosition += 40;
    doc.fontSize(14)
       .text('Remitos Incluidos:', 50, yPosition);

    yPosition += 20;

    // Remitos de facturas
    for (const invoice of pendingInvoices) {
      if (invoice.service.remitos && invoice.service.remitos.length > 0) {
        for (const remito of invoice.service.remitos) {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

                     doc.fontSize(10)
              .text(`Remito ${remito.number} - ${invoice.service.building.name}`, 50, yPosition);

           yPosition += 15;

           // Agregar solo imágenes del remito (los PDFs se combinan al final)
           if (remito.receiptImages && remito.receiptImages.length > 0) {
             for (const fileUrl of remito.receiptImages) {
               try {
                 // Solo procesar imágenes, no PDFs
                 if (!isPDF(fileUrl)) {
                   // Extraer el nombre del archivo de la URL completa
                   const filename = fileUrl.split('/').pop();
                   const filePath = path.join(__dirname, '../../uploads', filename);
                   
                   if (fs.existsSync(filePath)) {
                     if (yPosition > 650) {
                       doc.addPage();
                       yPosition = 50;
                     }
                     
                     doc.image(filePath, 70, yPosition, { width: 200 });
                     yPosition += 220;
                   }
                 }
               } catch (error) {
                 console.error('Error al agregar imagen al PDF:', error);
               }
             }
           }
        }
      }
    }

    // Remitos de Prov
    for (const payment of payments) {
      for (const paymentDoc of payment.documents) {
        if (paymentDoc.remito) {
          const remito = paymentDoc.remito;
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

                     doc.fontSize(10)
              .text(`Remito ${remito.number} - ${remito.service.building.name} (Cobro: ${payment.comprobante})`, 50, yPosition);

           yPosition += 15;

           // Agregar solo imágenes del remito (los PDFs se combinan al final)
           if (remito.receiptImages && remito.receiptImages.length > 0) {
             for (const fileUrl of remito.receiptImages) {
               try {
                 // Solo procesar imágenes, no PDFs
                 if (!isPDF(fileUrl)) {
                   // Extraer el nombre del archivo de la URL completa
                   const filename = fileUrl.split('/').pop();
                   const filePath = path.join(__dirname, '../../uploads', filename);
                   
                   if (fs.existsSync(filePath)) {
                     if (yPosition > 650) {
                       doc.addPage();
                       yPosition = 50;
                     }
                     
                     doc.image(filePath, 70, yPosition, { width: 200 });
                     yPosition += 220;
                   }
                 }
               } catch (error) {
                 console.error('Error al agregar imagen al PDF:', error);
               }
             }
           }
        }
      }
    }

    // Si hay un método de pago seleccionado, agregar una página con sus datos
    if (selectedPaymentMethod) {
      doc.addPage();
      
      // Agregar logo en la nueva página
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { width: 100 });
      }

      // Datos de la empresa
      doc.fontSize(12)
         .text('Garcia Coelho', 50, 160)
         .fontSize(10)
         .text('Av. Pte Illia 1823, San Martin', 50, 180)
         .text('4753-2393 | 4755-9908', 50, 195);

      // Título del método de pago
      doc.fontSize(16)
         .text(`Datos para ${selectedPaymentMethod.name}`, 50, 230)
         .fontSize(12);

      let yPosition = 260;

      // Agregar datos del método de pago
      if (selectedPaymentMethod.titular) {
        doc.text(`Titular: ${selectedPaymentMethod.titular}`, 50, yPosition);
        yPosition += 20;
      }
      if (selectedPaymentMethod.banco) {
        doc.text(`Banco: ${selectedPaymentMethod.banco}`, 50, yPosition);
        yPosition += 20;
      }
      if (selectedPaymentMethod.cuenta) {
        doc.text(`Cuenta: ${selectedPaymentMethod.cuenta}`, 50, yPosition);
        yPosition += 20;
      }
      if (selectedPaymentMethod.cuit) {
        doc.text(`CUIT: ${selectedPaymentMethod.cuit}`, 50, yPosition);
        yPosition += 20;
      }
      if (selectedPaymentMethod.cbu) {
        doc.text(`CBU: ${selectedPaymentMethod.cbu}`, 50, yPosition);
        yPosition += 20;
      }
      if (selectedPaymentMethod.alias) {
        doc.text(`Alias: ${selectedPaymentMethod.alias}`, 50, yPosition);
        yPosition += 20;
      }

      // Información de contacto
      yPosition += 30;
      doc.fontSize(14).text('Por favor enviar comprobante al e-mail o al Whatsapp:', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12).text('Mail: garciacoelho@hotmail.com', 50, yPosition);
      yPosition += 20;
      doc.text('Whatsapp: 1138341046', 50, yPosition);
    }

    // Finalizar el PDF del paquete
    doc.end();

  } catch (error) {
    console.error('Error al generar paquete:', error);
    res.status(500).json({ message: 'Error al generar paquete' });
  }
};

module.exports = {
  testData,
  testInvoices,
  getPackages,
  downloadPackage
};
