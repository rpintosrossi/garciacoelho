const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('🧹 Iniciando limpieza de todos los datos...');
    
    // Orden importante: eliminar en orden de dependencias
    // Primero las tablas que tienen foreign keys
    
    console.log('🗑️ Eliminando PaymentDocument...');
    await prisma.paymentDocument.deleteMany();
    
    console.log('🗑️ Eliminando Payment...');
    await prisma.payment.deleteMany();
    
    console.log('🗑️ Eliminando Remito...');
    await prisma.remito.deleteMany();
    
    console.log('🗑️ Eliminando Invoice...');
    await prisma.invoice.deleteMany();
    
    console.log('🗑️ Eliminando Service...');
    await prisma.service.deleteMany();
    
    console.log('🗑️ Eliminando ServiceDraft...');
    await prisma.serviceDraft.deleteMany();
    
    console.log('🗑️ Eliminando Account...');
    await prisma.account.deleteMany();
    
    console.log('🗑️ Eliminando Building...');
    await prisma.building.deleteMany();
    
    console.log('🗑️ Eliminando Administrator...');
    await prisma.administrator.deleteMany();
    
    console.log('🗑️ Eliminando Technician...');
    await prisma.technician.deleteMany();
    
    console.log('🗑️ Eliminando User...');
    await prisma.user.deleteMany();
    
    console.log('🗑️ Eliminando ZoneLocality...');
    await prisma.zoneLocality.deleteMany();
    
    console.log('🗑️ Eliminando Zone...');
    await prisma.zone.deleteMany();
    
    console.log('🗑️ Eliminando Locality...');
    await prisma.locality.deleteMany();
    
    console.log('🗑️ Eliminando PaymentMethod...');
    await prisma.paymentMethod.deleteMany();
    
    console.log('✅ ¡Limpieza completada! Todos los datos han sido eliminados.');
    console.log('📊 La estructura de la base de datos se mantiene intacta.');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  clearAllData()
    .then(() => {
      console.log('🎉 Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { clearAllData };
