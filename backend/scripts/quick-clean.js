const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickClean() {
  try {
    console.log('🚀 Limpieza rápida iniciada...');
    
    // Eliminar en lotes para mejor rendimiento
    const deletePromises = [
      prisma.paymentDocument.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.remito.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.service.deleteMany(),
      prisma.serviceDraft.deleteMany(),
      prisma.account.deleteMany(),
      prisma.building.deleteMany(),
      prisma.administrator.deleteMany(),
      prisma.technician.deleteMany(),
      prisma.user.deleteMany(),
      prisma.zoneLocality.deleteMany(),
      prisma.zone.deleteMany(),
      prisma.locality.deleteMany(),
      prisma.paymentMethod.deleteMany()
    ];
    
    await Promise.all(deletePromises);
    
    console.log('✅ ¡Limpieza rápida completada!');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  quickClean()
    .then(() => {
      console.log('🎉 Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { quickClean };
