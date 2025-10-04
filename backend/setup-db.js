const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DATABASE_URL = "postgresql://postgres:EkUtMnNdNc1jNXIYdGNoWhNZKIZsKjJP@gondola.proxy.rlwy.net:31019/railway";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function setupDatabase() {
  try {
    console.log('🔧 Configurando base de datos...');
    
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión exitosa!');
    
    // Ejecutar migraciones
    console.log('🔄 Ejecutando migraciones...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL }
      });
      console.log('✅ Migraciones ejecutadas exitosamente');
    } catch (migrationError) {
      console.log('⚠️ Error en migraciones, continuando...');
      console.log('Error:', migrationError.message);
    }
    
    // Verificar si hay usuarios
    const users = await prisma.user.findMany();
    console.log(`📊 Usuarios encontrados: ${users.length}`);
    
    if (users.length === 0) {
      console.log('👤 No hay usuarios. Creando administrador...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@admin.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log('\n🎉 ¡Usuario administrador creado exitosamente!');
      console.log('📧 Email: admin@admin.com');
      console.log('🔑 Contraseña: 123456');
      console.log('👤 Rol: ADMIN');
      console.log('🆔 ID:', admin.id);
      console.log('\n✅ Puedes usar estas credenciales para acceder al sistema');
    } else {
      console.log('👥 Usuarios existentes:');
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Posibles soluciones:');
    console.log('1. Verificar que la base de datos esté disponible');
    console.log('2. Verificar las credenciales de conexión');
    console.log('3. Verificar que las migraciones estén actualizadas');
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase(); 