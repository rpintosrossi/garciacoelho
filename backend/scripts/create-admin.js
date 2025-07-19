const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'admin',
        email: 'admin@admin.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log('Usuario administrador creado:', admin);
  } catch (error) {
    console.error('Error al crear usuario administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 