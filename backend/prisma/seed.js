const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Crear técnicos de prueba
  const technicians = [
    {
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      phone: '1234567890',
      status: 'ACTIVE',
    },
    {
      name: 'María García',
      email: 'maria.garcia@example.com',
      phone: '0987654321',
      status: 'ACTIVE',
    },
    {
      name: 'Carlos López',
      email: 'carlos.lopez@example.com',
      phone: '5555555555',
      status: 'ACTIVE',
    },
  ];

  console.log('Creando técnicos de prueba...');
  
  for (const technician of technicians) {
    const existingTechnician = await prisma.technician.findUnique({
      where: { email: technician.email },
    });

    if (!existingTechnician) {
      await prisma.technician.create({
        data: technician,
      });
      console.log(`Técnico creado: ${technician.name}`);
    } else {
      console.log(`Técnico ya existe: ${technician.name}`);
    }
  }

  console.log('Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 