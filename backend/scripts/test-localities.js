const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLocalities() {
  try {
    console.log('🧪 Iniciando pruebas de funcionalidad de localidades...');

    // 1. Verificar que existen zonas
    const zones = await prisma.zone.findMany({
      include: {
        localities: true
      }
    });

    if (zones.length === 0) {
      console.log('⚠️ No hay zonas creadas. Ejecuta primero: node scripts/seed-zones.js');
      return;
    }

    console.log(`✅ Se encontraron ${zones.length} zonas`);
    
    // Mostrar la primera zona con sus localidades
    const firstZone = zones[0];
    console.log(`\n📍 Zona: ${firstZone.name}`);
    console.log(`📊 Localidades: ${firstZone.localities.length}`);
    
    if (firstZone.localities.length > 0) {
      console.log('📍 Localidades:');
      firstZone.localities.slice(0, 5).forEach((locality, index) => {
        console.log(`   ${index + 1}. ${locality.locality} (ID: ${locality.id})`);
      });
      if (firstZone.localities.length > 5) {
        console.log(`   ... y ${firstZone.localities.length - 5} más`);
      }
    }

    // 2. Verificar estructura de datos
    console.log('\n🔍 Verificando estructura de datos...');
    
    const zoneCount = await prisma.zone.count();
    const localityCount = await prisma.zoneLocality.count();
    
    console.log(`📊 Total zonas: ${zoneCount}`);
    console.log(`📊 Total localidades: ${localityCount}`);
    
    // 3. Verificar relaciones
    console.log('\n🔗 Verificando relaciones...');
    
    const zonesWithLocalities = await prisma.zone.findMany({
      include: {
        _count: {
          select: {
            localities: true
          }
        }
      }
    });
    
    zonesWithLocalities.forEach(zone => {
      console.log(`📍 ${zone.name}: ${zone._count.localities} localidades`);
    });

    // 4. Verificar índices únicos
    console.log('\n🔒 Verificando restricciones únicas...');
    
    try {
      // Intentar crear una localidad duplicada (debería fallar)
      const testZone = zones[0];
      const testLocality = testZone.localities[0];
      
      if (testLocality) {
        console.log(`🧪 Probando restricción única para: ${testZone.name} - ${testLocality.locality}`);
        
        await prisma.zoneLocality.create({
          data: {
            zoneId: testZone.id,
            locality: testLocality.locality
          }
        });
        
        console.log('❌ ERROR: Se permitió crear una localidad duplicada');
      }
    } catch (error) {
      if (error.code === 'P2002') {
        console.log('✅ Restricción única funcionando correctamente');
      } else {
        console.log('⚠️ Error inesperado:', error.message);
      }
    }

    console.log('\n🎉 Pruebas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLocalities();
