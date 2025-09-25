const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    console.log('🔧 Creando usuario administrador...');
    
    // Generar contraseña hasheada
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    console.log('✅ Contraseña hasheada generada');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Contraseña: 123456');
    console.log('👤 Rol: ADMIN');
    console.log('🔐 Hash de contraseña:', hashedPassword);
    
    console.log('\n📋 Para crear el usuario, puedes:');
    console.log('1. Usar la interfaz web en http://localhost:3001');
    console.log('2. Hacer una petición POST a /api/auth/register con:');
    console.log('   {');
    console.log('     "name": "Administrador",');
    console.log('     "email": "admin@admin.com",');
    console.log('     "password": "123456",');
    console.log('     "role": "ADMIN"');
    console.log('   }');
    console.log('\n3. O usar el script de Prisma cuando esté disponible');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUser(); 