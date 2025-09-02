const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Lista de localidades predefinidas organizadas por categoría
const LOCALITIES_DATA = [
  {
    category: 'Ciudad Autónoma de Buenos Aires',
    localities: [
      'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos', 'Monte Castro', 'Montserrat', 'Nueva Pompeya', 'Núñez', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Puerto Madero', 'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Versalles', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre', 'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza', 'Vélez Sarsfield'
    ]
  },
  {
    category: 'Conurbano Bonaerense',
    localities: [
      'Almirante Brown', 'Avellaneda', 'Berazategui', 'Berisso', 'Cañuelas', 'Ensenada', 'Esteban Echeverría', 'Ezeiza', 'Florencio Varela', 'La Plata', 'Lanús', 'Lomas de Zamora', 'Presidente Perón', 'Quilmes', 'San Vicente'
    ]
  },
  {
    category: 'Interior de Buenos Aires',
    localities: [
      '25 de Mayo', 'Adolfo Alsina', 'Ayacucho', 'Azul', 'Balcarce', 'Benito Juárez', 'Bolívar', 'Castelli', 'Chascomús', 'Coronel Dorrego', 'Coronel Pringles', 'Coronel Rosales', 'Daireaux', 'Dolores', 'General Alvarado', 'General Alvear', 'General Belgrano', 'General Guido', 'General Lamadrid', 'General Lavalle', 'General Madariaga', 'General Paz', 'General Pueyrredón', 'González Chávez', 'Guaminí', 'La Costa', 'Laprida', 'Las Flores', 'Lezama', 'Lobería', 'Maipú', 'Mar Chiquita', 'Monte', 'Necochea', 'Olavarría', 'Patagones', 'Pellegrini', 'Pila', 'Pinamar', 'Puán', 'Rauch', 'Roque Pérez', 'Saavedra', 'Saladillo', 'Salliqueló'
    ]
  },
  {
    category: 'Zona Norte',
    localities: [
      'Escobar', 'General Rodríguez', 'General San Martín', 'Hurlingham', 'Ituzaingó', 'José C. Paz', 'La Matanza', 'Luján', 'Malvinas Argentinas', 'Marcos Paz', 'Merlo', 'Moreno', 'Morón', 'Pilar', 'San Fernando', 'San Isidro', 'San Miguel', 'Tigre', 'Tres de Febrero', 'Vicente López'
    ]
  },
  {
    category: 'Zona Oeste',
    localities: [
      'Alberti', 'Arrecifes', 'Baradero', 'Bragado', 'Capitán Sarmiento', 'Carlos Casares', 'Carlos Tejedor', 'Carmen de Areco', 'Chacabuco', 'Chivilcoy', 'Colón', 'Florentino Ameghino', 'General Arenales', 'General Pinto', 'General Villegas', 'Hipólito Yrigoyen', 'Junín', 'Leandro N. Alem', 'Lincoln', 'Mercedes', 'Navarro', 'Nueve de Julio', 'Pehuajó', 'Pergamino', 'Ramallo', 'Rivadavia', 'Salto', 'San Andrés de Giles', 'San Antonio de Areco', 'San Pedro', 'Suipacha', 'Trenque Lauquen', 'Zárate', 'San Cayetano', 'Tandil', 'Tapalqué', 'Tordillo', 'Tornquist', 'Tres Arroyos', 'Tres Lomas', 'Villa Gesell', 'Villarino'
    ]
  }
];

async function seedLocalities() {
  try {
    console.log('🌱 Iniciando seed de localidades...');

    // Limpiar tabla existente
    await prisma.locality.deleteMany({});
    console.log('🗑️ Tabla de localidades limpiada');

    // Crear un Set para evitar duplicados
    const allLocalities = new Set();
    const localitiesToInsert = [];

    // Procesar todas las localidades y eliminar duplicados
    for (const categoryData of LOCALITIES_DATA) {
      const { category, localities } = categoryData;
      
      for (const localityName of localities) {
        if (!allLocalities.has(localityName)) {
          allLocalities.add(localityName);
          localitiesToInsert.push({
            name: localityName,
            category: category,
            isActive: true
          });
        }
      }
    }

    console.log(`📊 Total de localidades únicas encontradas: ${localitiesToInsert.length}`);

    // Insertar todas las localidades de una vez
    await prisma.locality.createMany({
      data: localitiesToInsert,
      skipDuplicates: true
    });

    // Verificar total
    const totalLocalities = await prisma.locality.count();
    console.log(`🎉 Seed completado! Total de localidades insertadas: ${totalLocalities}`);

    // Mostrar resumen por categoría
    const localitiesByCategory = await prisma.locality.groupBy({
      by: ['category'],
      _count: {
        name: true
      }
    });

    console.log('\n📋 Resumen por categoría:');
    localitiesByCategory.forEach(item => {
      console.log(`  ${item.category}: ${item._count.name} localidades`);
    });

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
seedLocalities();
