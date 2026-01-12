const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificBuilding() {
  console.log('🔍 Verificando edificio "96 Salguero Ex 23"...\n');

  try {
    const building = await prisma.building.findFirst({
      where: {
        name: {
          contains: '96 Salguero',
          mode: 'insensitive'
        }
      },
      include: {
        account: true,
        administrator: true,
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

    if (!building) {
      console.log('❌ No se encontró el edificio');
      return;
    }

    console.log(`🏢 ${building.name}`);
    console.log(`   ID: ${building.id}`);
    console.log(`   Saldo en cuenta: $${building.account?.balance?.toFixed(2) || 0}\n`);

    console.log('📋 SERVICIOS Y DOCUMENTOS:\n');

    for (const service of building.services) {
      console.log(`\n   Servicio ID: ${service.id}`);
      console.log(`   Descripción: ${service.description}`);
      console.log(`   Estado: ${service.status}`);
      console.log(`   Fecha creación: ${service.createdAt.toISOString().split('T')[0]}`);

      if (service.invoice) {
        const totalPagado = service.invoice.paymentDocuments.reduce(
          (sum, pd) => sum + (pd.payment.originalAmount || pd.payment.amount), 0
        );
        console.log(`   📄 Factura:`);
        console.log(`      ID: ${service.invoice.id}`);
        console.log(`      Número: ${service.invoice.number || 'N/A'}`);
        console.log(`      Monto: $${service.invoice.amount.toFixed(2)}`);
        console.log(`      Fecha: ${service.invoice.date ? service.invoice.date.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`      Estado: ${service.invoice.status}`);
        console.log(`      Total pagado: $${totalPagado.toFixed(2)}`);
        console.log(`      Pendiente: $${(service.invoice.amount - totalPagado).toFixed(2)}`);
        
        if (service.invoice.paymentDocuments.length > 0) {
          console.log(`      Pagos (${service.invoice.paymentDocuments.length}):`);
          for (const pd of service.invoice.paymentDocuments) {
            console.log(`         - ${pd.payment.date.toISOString().split('T')[0]}: $${(pd.payment.originalAmount || pd.payment.amount).toFixed(2)} (${pd.payment.method})`);
          }
        }
      }

      if (service.remitos.length > 0) {
        for (const remito of service.remitos) {
          const totalPagado = remito.paymentDocuments.reduce(
            (sum, pd) => sum + (pd.payment.originalAmount || pd.payment.amount), 0
          );
          console.log(`   🧾 Remito:`);
          console.log(`      ID: ${remito.id}`);
          console.log(`      Número: ${remito.number || 'N/A'}`);
          console.log(`      Monto: $${remito.amount.toFixed(2)}`);
          console.log(`      Fecha: ${remito.date.toISOString().split('T')[0]}`);
          console.log(`      Estado: ${remito.status}`);
          console.log(`      Total pagado: $${totalPagado.toFixed(2)}`);
          console.log(`      Pendiente: $${(remito.amount - totalPagado).toFixed(2)}`);
          
          if (remito.paymentDocuments.length > 0) {
            console.log(`      Pagos (${remito.paymentDocuments.length}):`);
            for (const pd of remito.paymentDocuments) {
              console.log(`         - ${pd.payment.date.toISOString().split('T')[0]}: $${(pd.payment.originalAmount || pd.payment.amount).toFixed(2)} (${pd.payment.method})`);
            }
          }
        }
      }
    }

    console.log('\n\n¿Quieres eliminar los servicios/facturas/remitos de este edificio? (S/N)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificBuilding();
