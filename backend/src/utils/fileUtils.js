/**
 * Utilidades para manejo de archivos y URLs
 */

/**
 * Obtiene la URL base del backend
 */
const getBackendUrl = () => {
  // En producción, usar la URL de Railway
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    return 'https://backend-production-6dca.u.railway.app';
  }
  
  // En desarrollo, usar la URL local o la configurada
  return process.env.BACKEND_URL || 'http://localhost:3000';
};

/**
 * Genera la URL completa para un archivo
 */
const getFileUrl = (filename) => {
  // Si no hay filename, retornar null
  if (!filename) {
    return null;
  }

  // Si ya es una URL completa (http o https), devolverla tal cual
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Si usamos S3, construir la URL de S3
  if (process.env.USE_S3 === 'true') {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
  }
  
  // Almacenamiento local
  const baseUrl = getBackendUrl();
  return `${baseUrl}/uploads/${filename}`;
};

/**
 * Convierte URLs relativas a absolutas
 */
const convertToAbsoluteUrls = (urls) => {
  if (!urls || !Array.isArray(urls)) return urls;
  
  return urls.map(url => {
    // Si ya es una URL absoluta, devolverla tal como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Si es una URL relativa, convertirla a absoluta
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '');
      return getFileUrl(filename);
    }
    
    // Si no tiene formato reconocido, asumir que es un filename
    return getFileUrl(url);
  });
};

module.exports = {
  getBackendUrl,
  getFileUrl,
  convertToAbsoluteUrls
};
