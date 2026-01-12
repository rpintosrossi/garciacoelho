const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOrphanData() {
  console.log('🔍 Buscando datos huérfanos...\n');

  try {
    // 1. Encontrar payment documents sin invoice o remito
    const orphanPaymentDocs = await prisma.paymentDocument.findMany({
      where: {
        AND: [
          { invoiceId: null },
          { remitoId: null }
        ]
      }
    });

    console.log(`📄 Payment documents sin factura ni remito: ${orphanPaymentDocs.length}`);
    if (orphanPaymentDocs.length > 0) {
      await prisma.paymentDocument.deleteMany({
        where: {
          id: { in: orphanPaymentDocs.map(pd => pd.id) }
        }
      });
      console.log(`✅ Eliminados ${orphanPaymentDocs.length} payment documents huérfanos\n`);
    }

    // 2. Encontrar payment documents con invoiceId o remitoId que no existen
    const allPaymentDocs = await prisma.paymentDocument.findMany({
      include: {
        invoice: true,
        remito: true
      }
    });

    const invalidPaymentDocs = allPaymentDocs.filter(pd => 
      (pd.invoiceId && !pd.invoice) || (pd.remitoId && !pd.remito)
    );

    console.log(`📄 Payment documents con referencias inválidas: ${invalidPaymentDocs.length}`);
    if (invalidPaymentDocs.length > 0) {
      await prisma.paymentDocument.deleteMany({
        where: {
          id: { in: invalidPaymentDocs.map(pd => pd.id) }
        }
      });
      console.log(`✅ Eliminados ${invalidPaymentDocs.length} payment documents con referencias inválidas\n`);
    }

    // 3. Encontrar pagos sin payment documents
    const paymentsWithoutDocs = await prisma.payment.findMany({
      include: {
        documents: true
      }
    });

    const orphanPayments = paymentsWithoutDocs.filter(p => p.documents.length === 0);
    console.log(`💰 Pagos sin documentos asociados: ${orphanPayments.length}`);
    if (orphanPayments.length > 0) {
      await prisma.payment.deleteMany({
        where: {
          id: { in: orphanPayments.map(p => p.id) }
        }
      });
      console.log(`✅ Eliminados ${orphanPayments.length} pagos huérfanos\n`);
    }

    // 4. Recalcular saldos de cuentas
    console.log('💰 Recalculando saldos de cuentas...');
    const buildings = await prisma.building.findMany({
      include: {
        account: true,
        services: {
          include: {
            invoice: {
              include: {
                paymentDocuments: {
                  include: {
                    payment: true
                  }
                }
              }
            },
            remitos: {
              include: {
                paymentDocuments: {
                  include: {
                    payment: true
                  }
                }
              }
            }
          }
        }
      }
    });

    for (const building of buildings) {
      let balance = 0;

      // Sumar facturas
      for (const service of building.services) {
        if (service.invoice) {
          balance += service.invoice.amount;

          // Restar pagos de facturas
          for (const pd of service.invoice.paymentDocuments) {
            balance -= (pd.payment.originalAmount || pd.payment.amount);
          }
        }

        // Sumar remitos
        for (const remito of service.remitos) {
          balance += remito.amount;

          // Restar pagos de remitos
          for (const pd of remito.paymentDocuments) {
            balance -= (pd.payment.originalAmount || pd.payment.amount);
          }
        }
      }

      // Actualizar o crear cuenta
      if (building.account) {
        await prisma.account.update({
          where: { id: building.account.id },
          data: { balance }
        });
      } else {
        await prisma.account.create({
          data: {
            buildingId: building.id,
            balance
          }
        });
      }

      console.log(`  ✓ ${building.name}: ${balance.toFixed(2)}`);
    }

    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`  - Payment documents eliminados: ${orphanPaymentDocs.length + invalidPaymentDocs.length}`);
    console.log(`  - Pagos eliminados: ${orphanPayments.length}`);
    console.log(`  - Cuentas actualizadas: ${buildings.length}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanOrphanData()
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
