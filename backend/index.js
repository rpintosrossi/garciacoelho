const app = require('./src/app');
const dotenv = require('dotenv');

// Configuración de variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000; // Usar el puerto de Railway o 3000 por defecto

app.listen(PORT, () => {
  console.log(`[SERVER] Servidor corriendo en el puerto ${PORT}`);
}); 