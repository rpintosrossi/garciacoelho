const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listOrphanPayments() {
  try {
    console.log('🔍 Analizando pagos del sistema...\n');
    
    // Obtener todos los pagos con sus documentos
    const allPayments = await prisma.payment.findMany({
      include: {
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
        },
        paymentMethod: true
      }
    });

    console.log(`📊 Total de pagos: ${allPayments.length}\n`);

    // Analizar cada pago
    const orphanPayments = [];
    const validPayments = [];
    const paymentsWithoutDocs = [];

    for (const payment of allPayments) {
      if (payment.documents.length === 0) {
        paymentsWithoutDocs.push(payment);
        continue;
      }

      let hasValidBuilding = false;
      
      for (const doc of payment.documents) {
        const building = doc.invoice?.service?.building || doc.remito?.service?.building;
        if (building) {
          hasValidBuilding = true;
          break;
        }
      }

      if (!hasValidBuilding) {
        orphanPayments.push(payment);
      } else {
        validPayments.push(payment);
      }
    }

    console.log('📈 RESUMEN:\n');
    console.log(`✅ Pagos válidos: ${validPayments.length}`);
    console.log(`⚠️  Pagos sin edificios: ${orphanPayments.length}`);
    console.log(`⚠️  Pagos sin documentos: ${paymentsWithoutDocs.length}\n`);

    if (orphanPayments.length > 0) {
      console.log('=' .repeat(80));
      console.log('PAGOS HUÉRFANOS (sin edificios asociados):');
      console.log('=' .repeat(80));
      
      orphanPayments.forEach((payment, index) => {
        console.log(`\n${index + 1}. ID: ${payment.id}`);
        console.log(`   Fecha: ${payment.date.toLocaleDateString('es-AR')}`);
        console.log(`   Monto: $${payment.amount.toLocaleString('es-AR')}`);
        console.log(`   Comprobante: ${payment.comprobante}`);
        console.log(`   Método: ${payment.paymentMethod?.name || payment.method || 'N/A'}`);
        console.log(`   Documentos: ${payment.documents.length}`);
        
        payment.documents.forEach((doc, docIndex) => {
          const type = doc.invoiceId ? 'Factura' : 'Remito';
          const docId = doc.invoiceId || doc.remitoId;
          console.log(`      ${docIndex + 1}. ${type} ID: ${docId} - $${doc.amount}`);
        });
      });
    }

    if (paymentsWithoutDocs.length > 0) {
      console.log('\n' + '=' .repeat(80));
      console.log('PAGOS SIN DOCUMENTOS ASOCIADOS:');
      console.log('=' .repeat(80));
      
      paymentsWithoutDocs.forEach((payment, index) => {
        console.log(`\n${index + 1}. ID: ${payment.id}`);
        console.log(`   Fecha: ${payment.date.toLocaleDateString('es-AR')}`);
        console.log(`   Monto: $${payment.amount.toLocaleString('es-AR')}`);
        console.log(`   Comprobante: ${payment.comprobante}`);
        console.log(`   Método: ${payment.paymentMethod?.name || payment.method || 'N/A'}`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    
    if (orphanPayments.length > 0 || paymentsWithoutDocs.length > 0) {
      console.log('\n💡 Para eliminar estos pagos, ejecuta:');
      console.log('   node scripts/clean-orphan-payments.js');
    } else {
      console.log('\n✨ ¡Todo está en orden! No hay pagos para limpiar.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listOrphanPayments();
