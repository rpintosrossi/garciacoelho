const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanOrphanPayments() {
  try {
    console.log('🔍 Verificando pagos huérfanos (sin edificios asociados)...\n');
    
    // 1. Obtener todos los pagos con sus documentos
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

    console.log(`📊 Total de pagos en el sistema: ${allPayments.length}\n`);

    // 2. Identificar pagos problemáticos
    const orphanPayments = []; // Pagos con documentos pero sin edificios
    const paymentsWithoutDocs = []; // Pagos sin documentos
    const validPayments = [];

    for (const payment of allPayments) {
      // Caso 1: Pagos sin documentos
      if (payment.documents.length === 0) {
        paymentsWithoutDocs.push(payment);
        continue;
      }

      // Caso 2: Pagos con documentos pero sin edificios
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

    // Combinar todos los pagos a eliminar
    const paymentsToDelete = [...orphanPayments, ...paymentsWithoutDocs];

    console.log(`✅ Pagos válidos (con edificios existentes): ${validPayments.length}`);
    console.log(`⚠️  Pagos sin edificios asociados: ${orphanPayments.length}`);
    console.log(`⚠️  Pagos sin documentos: ${paymentsWithoutDocs.length}`);
    console.log(`🗑️  Total de pagos a eliminar: ${paymentsToDelete.length}\n`);

    if (paymentsToDelete.length === 0) {
      console.log('✨ No hay pagos para limpiar. Todo está en orden.');
      return;
    }

    // 3. Mostrar detalles de los pagos a eliminar
    console.log('📋 Detalles de pagos a eliminar:\n');
    
    if (orphanPayments.length > 0) {
      console.log('--- Pagos sin edificios asociados ---');
      orphanPayments.forEach((payment, index) => {
        console.log(`${index + 1}. Pago ID: ${payment.id}`);
        console.log(`   - Fecha: ${payment.date.toLocaleDateString('es-AR')}`);
        console.log(`   - Monto: $${payment.amount.toLocaleString('es-AR')}`);
        console.log(`   - Comprobante: ${payment.comprobante}`);
        console.log(`   - Método: ${payment.paymentMethod?.name || payment.method}`);
        console.log(`   - Documentos asociados: ${payment.documents.length}`);
        console.log('');
      });
    }
    
    if (paymentsWithoutDocs.length > 0) {
      console.log('--- Pagos sin documentos ---');
      paymentsWithoutDocs.forEach((payment, index) => {
        console.log(`${index + 1}. Pago ID: ${payment.id}`);
        console.log(`   - Fecha: ${payment.date.toLocaleDateString('es-AR')}`);
        console.log(`   - Monto: $${payment.amount.toLocaleString('es-AR')}`);
        console.log(`   - Comprobante: ${payment.comprobante}`);
        console.log(`   - Método: ${payment.paymentMethod?.name || payment.method}`);
        console.log('');
      });
    }

    // 4. Preguntar confirmación
    console.log('⚠️  ADVERTENCIA: Esta operación eliminará permanentemente estos pagos.\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('¿Deseas eliminar estos pagos? (si/no): ', async (answer) => {
      if (answer.toLowerCase() === 'si' || answer.toLowerCase() === 's') {
        console.log('\n🗑️  Eliminando pagos...\n');
        
        let deletedCount = 0;
        for (const payment of paymentsToDelete) {
          try {
            // Primero eliminar los PaymentDocuments asociados (si existen)
            await prisma.paymentDocument.deleteMany({
              where: { paymentId: payment.id }
            });
            
            // Luego eliminar el Payment
            await prisma.payment.delete({
              where: { id: payment.id }
            });
            
            deletedCount++;
            console.log(`✅ Eliminado pago ${payment.comprobante}`);
          } catch (error) {
            console.error(`❌ Error al eliminar pago ${payment.comprobante}:`, error.message);
          }
        }
        
        console.log(`\n✅ Proceso completado. Pagos eliminados: ${deletedCount}/${paymentsToDelete.length}`);
      } else {
        console.log('\n❌ Operación cancelada. No se eliminó ningún pago.');
      }
      
      rl.close();
      await prisma.$disconnect();
    });

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanOrphanPayments();
