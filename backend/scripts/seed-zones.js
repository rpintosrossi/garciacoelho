const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const zonesData = [
  {
    name: 'Ciudad Autónoma de Buenos Aires',
    description: 'Zona que comprende todos los barrios de la Ciudad Autónoma de Buenos Aires',
    localities: [
      'Agronomía', 'Almagro', 'Balvanera', 'Barracas', 'Belgrano', 'Boedo', 'Caballito', 'Chacarita', 'Coghlan', 'Colegiales', 'Constitución', 'Flores', 'Floresta', 'La Boca', 'La Paternal', 'Liniers', 'Mataderos', 'Monte Castro', 'Montserrat', 'Nueva Pompeya', 'Núñez', 'Palermo', 'Parque Avellaneda', 'Parque Chacabuco', 'Parque Chas', 'Parque Patricios', 'Puerto Madero', 'Recoleta', 'Retiro', 'Saavedra', 'San Cristóbal', 'San Nicolás', 'San Telmo', 'Versalles', 'Villa Crespo', 'Villa del Parque', 'Villa Devoto', 'Villa General Mitre', 'Villa Lugano', 'Villa Luro', 'Villa Ortúzar', 'Villa Pueyrredón', 'Villa Real', 'Villa Riachuelo', 'Villa Santa Rita', 'Villa Soldati', 'Villa Urquiza', 'Vélez Sarsfield'
    ]
  },
  {
    name: 'Conurbano Bonaerense',
    description: 'Zona que comprende los partidos del Gran Buenos Aires',
    localities: [
      'Almirante Brown', 'Avellaneda', 'Berazategui', 'Berisso', 'Cañuelas', 'Ensenada', 'Esteban Echeverría', 'Ezeiza', 'Florencio Varela', 'La Plata', 'Lanús', 'Lomas de Zamora', 'Presidente Perón', 'Quilmes', 'San Vicente'
    ]
  },
  {
    name: 'Zona Norte',
    description: 'Zona norte del Gran Buenos Aires',
    localities: [
      'Escobar', 'General Rodríguez', 'General San Martín', 'Hurlingham', 'Ituzaingó', 'José C. Paz', 'La Matanza', 'Luján', 'Malvinas Argentinas', 'Marcos Paz', 'Merlo', 'Moreno', 'Morón', 'Pilar', 'San Fernando', 'San Isidro', 'San Miguel', 'Tigre', 'Tres de Febrero', 'Vicente López'
    ]
  },
  {
    name: 'Zona Oeste',
    description: 'Zona oeste de la provincia de Buenos Aires',
    localities: [
      'Alberti', 'Arrecifes', 'Baradero', 'Bragado', 'Capitán Sarmiento', 'Carlos Casares', 'Carlos Tejedor', 'Carmen de Areco', 'Chacabuco', 'Chivilcoy', 'Colón', 'Florentino Ameghino', 'General Arenales', 'General Pinto', 'General Villegas', 'Hipólito Yrigoyen', 'Junín', 'Leandro N. Alem', 'Lincoln', 'Mercedes', 'Navarro', 'Nueve de Julio', 'Pehuajó', 'Pergamino', 'Ramallo', 'Rivadavia', 'Salto', 'San Andrés de Giles', 'San Antonio de Areco', 'San Nicolás', 'San Pedro', 'Suipacha', 'Trenque Lauquen', 'Zárate'
    ]
  },
  {
    name: 'Costa Atlántica',
    description: 'Zona de la costa atlántica bonaerense',
    localities: [
      'La Costa', 'Mar Chiquita', 'Pinamar', 'Villa Gesell', 'General Alvarado', 'General Madariaga', 'General Lavalle', 'Tordillo', 'San Cayetano', 'Tres Arroyos', 'Tres Lomas', 'Villarino'
    ]
  },
  {
    name: 'Interior Sur',
    description: 'Zona sur del interior de la provincia de Buenos Aires',
    localities: [
      '25 de Mayo', 'Adolfo Alsina', 'Ayacucho', 'Azul', 'Balcarce', 'Benito Juárez', 'Bolívar', 'Castelli', 'Chascomús', 'Coronel Dorrego', 'Coronel Pringles', 'Coronel Rosales', 'Daireaux', 'Dolores', 'General Alvear', 'General Belgrano', 'General Guido', 'General Lamadrid', 'General Paz', 'General Pueyrredón', 'González Chávez', 'Guaminí', 'Laprida', 'Las Flores', 'Lezama', 'Lobería', 'Maipú', 'Monte', 'Necochea', 'Olavarría', 'Patagones', 'Pellegrini', 'Pila', 'Puán', 'Rauch', 'Roque Pérez', 'Saavedra', 'Saladillo', 'Salliqueló', 'Tandil', 'Tapalqué', 'Tornquist'
    ]
  }
];

async function seedZones() {
  try {
    console.log('🌱 Iniciando seed de zonas...');

    // Limpiar zonas existentes
    console.log('🗑️ Limpiando zonas existentes...');
    await prisma.zoneLocality.deleteMany();
    await prisma.zone.deleteMany();
    console.log('✅ Zonas existentes eliminadas');

    // Crear zonas
    for (let i = 0; i < zonesData.length; i++) {
      const zoneData = zonesData[i];
      console.log(`📝 Creando zona ${i + 1}/${zonesData.length}: ${zoneData.name}`);
      
      try {
        const zone = await prisma.zone.create({
          data: {
            name: zoneData.name,
            description: zoneData.description,
            localities: {
              create: zoneData.localities.map(locality => ({
                locality
              }))
            }
          },
          include: {
            localities: true
          }
        });

        console.log(`✅ Zona creada: ${zone.name} con ${zone.localities.length} localidades`);
      } catch (error) {
        console.error(`❌ Error creando zona ${zoneData.name}:`, error.message);
        throw error;
      }
    }

    console.log('🎉 Seed de zonas completado exitosamente');
    
    // Verificar que se crearon todas las zonas
    const totalZones = await prisma.zone.count();
    const totalLocalities = await prisma.zoneLocality.count();
    console.log(`📊 Total de zonas creadas: ${totalZones}`);
    console.log(`📊 Total de localidades creadas: ${totalLocalities}`);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedZones();
