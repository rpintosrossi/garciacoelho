// Script de prueba para payment methods
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testPaymentMethods() {
  try {
    console.log('🧪 Probando endpoints de payment methods...');
    
    // 1. Probar endpoint de prueba
    console.log('\n1. Probando endpoint de prueba...');
    const testResponse = await axios.get(`${API_URL}/payment-methods/test`);
    console.log('✅ Endpoint de prueba:', testResponse.data);
    
    // 2. Probar GET (sin autenticación debería fallar)
    console.log('\n2. Probando GET sin autenticación...');
    try {
      const getResponse = await axios.get(`${API_URL}/payment-methods`);
      console.log('❌ GET sin auth no debería funcionar:', getResponse.data);
    } catch (error) {
      console.log('✅ GET sin auth falló correctamente:', error.response?.status);
    }
    
    // 3. Probar POST (sin autenticación debería fallar)
    console.log('\n3. Probando POST sin autenticación...');
    try {
      const postResponse = await axios.post(`${API_URL}/payment-methods`, {
        name: 'Test Payment Method',
        titular: 'Test Titular',
        banco: 'Test Banco'
      });
      console.log('❌ POST sin auth no debería funcionar:', postResponse.data);
    } catch (error) {
      console.log('✅ POST sin auth falló correctamente:', error.response?.status);
    }
    
    console.log('\n🎉 Pruebas completadas!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testPaymentMethods();
