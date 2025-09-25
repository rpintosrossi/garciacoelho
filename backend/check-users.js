const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAndCreateUsers() {
  try {
    console.log('Verificando usuarios existentes...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log('Usuarios existentes:', users);

    if (users.length === 0) {
      console.log('No hay usuarios. Creando usuario administrador...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@admin.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });

      console.log('Usuario administrador creado:', {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      });
      
      console.log('\nCredenciales de acceso:');
      console.log('Email: admin@admin.com');
      console.log('Contraseña: 123456');
    } else {
      console.log('Ya existen usuarios en el sistema.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateUsers(); 