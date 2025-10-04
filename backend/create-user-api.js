const http = require('http');

const postData = JSON.stringify({
  name: 'Administrador',
  email: 'admin@admin.com',
  password: '123456',
  role: 'ADMIN'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Respuesta del servidor:', response);
      
      if (res.statusCode === 201) {
        console.log('\n🎉 Usuario creado exitosamente!');
        console.log('📧 Email: admin@admin.com');
        console.log('🔑 Contraseña: 123456');
        console.log('👤 Rol: ADMIN');
      }
    } catch (error) {
      console.log('📄 Respuesta del servidor:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error al hacer la petición:', error.message);
  console.log('\n💡 Asegúrate de que el servidor esté corriendo en el puerto 3000');
});

req.write(postData);
req.end();

console.log('🚀 Enviando petición para crear usuario...'); 