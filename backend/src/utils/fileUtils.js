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
