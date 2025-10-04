const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Herramientas',
    description: 'Herramientas manuales y eléctricas',
    color: '#ff9800',
  },
  {
    name: 'Materiales',
    description: 'Materiales de construcción y electricidad',
    color: '#4caf50',
  },
  {
    name: 'Equipos',
    description: 'Equipos y maquinaria',
    color: '#2196f3',
  },
  {
    name: 'Consumibles',
    description: 'Productos consumibles y repuestos',
    color: '#9c27b0',
  },
];

async function seedCategories() {
  console.log('🌱 Iniciando seed de categorías...');

  try {
    for (const categoryData of defaultCategories) {
      // Verificar si la categoría ya existe
      const existing = await prisma.category.findUnique({
        where: { name: categoryData.name }
      });

      if (existing) {
        console.log(`⏭️  Categoría "${categoryData.name}" ya existe, saltando...`);
        continue;
      }

      // Crear la categoría
      const category = await prisma.category.create({
        data: categoryData
      });

      console.log(`✅ Categoría creada: ${category.name}`);
    }

    console.log('✨ Seed de categorías completado exitosamente');
  } catch (error) {
    console.error('❌ Error al crear categorías:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();

