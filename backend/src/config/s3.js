const { S3Client } = require('@aws-sdk/client-s3');

// Configurar cliente S3
// Asegurar que la región no tenga espacios en blanco y tenga un valor por defecto válido
// Sanitizar la región para evitar caracteres inválidos que causan EndpointError
let region = process.env.AWS_REGION && process.env.AWS_REGION.trim() ? process.env.AWS_REGION.trim() : 'us-east-1';

// Eliminar comillas si las tuviera (común en .env mal formateados)
region = region.replace(/["']/g, '');

// Validar que sea una región válida de AWS (simplificado)
if (!/^[a-z0-9-]+$/.test(region)) {
  console.warn(`[S3 Config] Region '${region}' contains invalid characters. Falling back to 'us-east-1'.`);
  region = 'us-east-1';
}

console.log('[S3 Config] Using region:', region);

const s3Config = {
  region: region
};

// Solo agregar credenciales si existen
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

module.exports = s3Client;

