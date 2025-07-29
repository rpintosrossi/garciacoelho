const { execSync } = require('child_process');
const app = require('./src/app');
const dotenv = require('dotenv');

// Configuración de variables de entorno
dotenv.config();

async function startServer() {
  try {
    // Ejecutar migraciones de Prisma
    console.log('[SERVER] Ejecutando migraciones de Prisma...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('[SERVER] Migraciones completadas exitosamente');
  } catch (error) {
    console.error('[SERVER] Error ejecutando migraciones:', error.message);
    // Continuar sin migraciones si fallan
  }

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`[SERVER] Servidor corriendo en el puerto ${PORT}`);
  });
}

startServer().catch(console.error); 