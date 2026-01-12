export const config = {
  // API URL - usar la URL del backend en Railway
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://backend-production-6dca.u.railway.app/api'
      : 'http://localhost:3000/api'),
  
  // App URL
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.NODE_ENV === 'production'
      ? 'https://garciacoelho-production.up.railway.app'
      : 'http://localhost:3001'),
  
  // Puerto
  port: process.env.PORT || 3001,
  
  // Entorno
  environment: process.env.NODE_ENV || 'development',
  
  // Railway específico
  isRailway: process.env.RAILWAY_ENVIRONMENT === 'production'
};

console.log('Config loaded:', {
  apiUrl: config.apiUrl,
  appUrl: config.appUrl,
  port: config.port,
  environment: config.environment,
  isRailway: config.isRailway
}); 