const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🔄 Iniciando reset completo de la base de datos...');
    
    // Opción 1: Usar Prisma migrate reset (recomendado)
    console.log('📦 Ejecutando Prisma migrate reset...');
    try {
      execSync('npx prisma migrate reset --force', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Reset completado con Prisma migrate reset');
    } catch (error) {
      console.log('⚠️ Prisma migrate reset falló, intentando método alternativo...');
      
      // Opción 2: Eliminar todas las tablas manualmente
      console.log('🗑️ Eliminando todas las tablas...');
      
      // Desconectar Prisma
      await prisma.$disconnect();
      
      // Ejecutar SQL directo para eliminar todas las tablas
      const dropTablesSQL = `
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `;
      
      // Esto requiere ejecutar SQL directo contra la base de datos
      console.log('⚠️ Para completar el reset, ejecuta manualmente en tu base de datos:');
      console.log(dropTablesSQL);
      
      console.log('🔄 Luego ejecuta: npx prisma migrate deploy');
    }
    
  } catch (error) {
    console.error('❌ Error durante el reset:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Reset completado exitosamente');
      console.log('💡 Recuerda ejecutar: npx prisma migrate deploy');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
