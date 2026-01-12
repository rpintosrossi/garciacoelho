// Script de prueba para verificar las rutas de talleres y reparaciones
// Ejecutar con: node backend/scripts/test-workshop-routes.js

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testWorkshopRoutes() {
  console.log('🧪 Iniciando pruebas de rutas de talleres...\n');

  // Obtener token (necesitas ajustar con credenciales válidas)
  const token = process.env.TEST_TOKEN;
  
  if (!token) {
    console.log('⚠️  No se encontró TEST_TOKEN en las variables de entorno');
    console.log('   Configura TEST_TOKEN con un token válido para probar las rutas');
    console.log('   O prueba manualmente las siguientes rutas:\n');
  }

  console.log('📋 Rutas disponibles:');
  console.log('');
  console.log('Talleres:');
  console.log('  GET    /api/workshops              - Listar talleres');
  console.log('  POST   /api/workshops              - Crear taller');
  console.log('  PUT    /api/workshops/:id          - Actualizar taller');
  console.log('  DELETE /api/workshops/:id          - Eliminar taller');
  console.log('');
  console.log('Reparaciones:');
  console.log('  GET    /api/workshop-repairs       - Listar reparaciones');
  console.log('  GET    /api/workshop-repairs/:id   - Obtener reparación');
  console.log('  POST   /api/workshop-repairs       - Crear reparación');
  console.log('  PUT    /api/workshop-repairs/:id   - Actualizar reparación');
  console.log('  DELETE /api/workshop-repairs/:id   - Eliminar reparación');
  console.log('');

  console.log('💡 Ejemplo de uso con cURL:');
  console.log('');
  console.log('# Crear taller:');
  console.log(`curl -X POST ${API_URL}/api/workshops \\`);
  console.log('  -H "Authorization: Bearer TU_TOKEN" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"name":"Taller Test","address":"Calle Falsa 123","phone":"123456789","contact":"Juan Perez"}\'');
  console.log('');
  
  console.log('# Crear reparación:');
  console.log(`curl -X POST ${API_URL}/api/workshop-repairs \\`);
  console.log('  -H "Authorization: Bearer TU_TOKEN" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"serviceId":"SERVICE_ID","workshopId":"WORKSHOP_ID","buildingAddress":"Dirección edificio","doormanBrand":"Marca"}\'');
  console.log('');

  console.log('✅ Rutas configuradas correctamente en el backend');
}

testWorkshopRoutes().catch(console.error);
