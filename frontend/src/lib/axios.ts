import axios from 'axios';
import { config } from './config';

// Cache mejorado para evitar peticiones duplicadas
const requestCache = new Map();
const pendingRequests = new Map();
const CACHE_DURATION = 300000; // 5 minutos (aumentado para reducir peticiones)

// Sistema de eventos para notificar cambios
const eventEmitter = {
  listeners: new Map(),
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  },
  
  emit(event: string, data?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  },
  
  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
};

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use((config) => {
  // Log en desarrollo para todas las peticiones
  if (process.env.NODE_ENV === 'development') {
    console.log('[AXIOS] Realizando petición:', {
      method: config.method,
      url: config.url,
      data: config.data
    });
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('[AXIOS] Error en la petición:', error);
  return Promise.reject(error);
});

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    // Log en desarrollo para todas las respuestas
    if (process.env.NODE_ENV === 'development') {
      console.log('[AXIOS] Respuesta recibida:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    // Mejorar el logging del error
    const errorInfo = {
      status: error.response?.status || 'Sin respuesta',
      url: error.config?.url || 'URL desconocida',
      message: error.message || 'Sin mensaje',
      data: error.response?.data || 'Sin datos',
      code: error.code || 'Sin código',
      isNetworkError: !error.response,
    };
    
    console.error('[AXIOS] Error en la respuesta:', errorInfo);
    
    // Si es un error de red (no hay respuesta del servidor)
    if (!error.response) {
      console.error('[AXIOS] ⚠️ Error de red - El servidor backend puede no estar corriendo');
    }
    
    return Promise.reject(error);
  }
);

// Función para hacer peticiones con caché mejorado
export const cachedApi = {
  get: async (url: string, config?: any) => {
    const cacheKey = `${url}-${JSON.stringify(config || {})}`;
    
    // Verificar si hay una petición pendiente
    if (pendingRequests.has(cacheKey)) {
      console.log(`🔄 [CACHE] Reutilizando petición pendiente para: ${url}`);
      return pendingRequests.get(cacheKey);
    }
    
    // Verificar caché
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`⚡ [CACHE] Usando caché para: ${url}`);
      return cached.data;
    }
    
    // Crear nueva petición
    console.log(`🚀 [CACHE] Nueva petición para: ${url}`);
    const requestPromise = api.get(url, config);
    pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const response = await requestPromise;
      requestCache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      console.log(`✅ [CACHE] Petición completada y cacheada: ${url}`);
      return response;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  },
  
  post: async (url: string, data?: any, config?: any) => {
    const response = await api.post(url, data, config);
    
    // Notificar cambios en servicios
    if (url.includes('/services')) {
      console.log('📢 [EVENTS] Notificando cambio en servicios');
      eventEmitter.emit('servicesChanged', { url, data });
    }
    
    return response;
  },
  
  put: async (url: string, data?: any, config?: any) => {
    const response = await api.put(url, data, config);
    
    // Notificar cambios en servicios
    if (url.includes('/services')) {
      console.log('📢 [EVENTS] Notificando cambio en servicios');
      eventEmitter.emit('servicesChanged', { url, data });
    }
    
    return response;
  },
  
  patch: async (url: string, data?: any, config?: any) => {
    const response = await api.patch(url, data, config);
    
    // Notificar cambios en servicios
    if (url.includes('/services')) {
      console.log('📢 [EVENTS] Notificando cambio en servicios');
      eventEmitter.emit('servicesChanged', { url, data });
    }
    
    return response;
  },
  
  delete: async (url: string, config?: any) => {
    const response = await api.delete(url, config);
    
    // Notificar cambios en servicios
    if (url.includes('/services')) {
      console.log('📢 [EVENTS] Notificando cambio en servicios');
      eventEmitter.emit('servicesChanged', { url });
    }
    
    return response;
  },
  
  // Limpiar caché
  clearCache: () => {
    requestCache.clear();
  },
  
  // Limpiar caché para una URL específica
  clearCacheFor: (url: string) => {
    for (const key of requestCache.keys()) {
      if (key.startsWith(url)) {
        requestCache.delete(key);
      }
    }
  },
  
  // Sistema de eventos
  onServicesChanged: (callback: Function) => {
    eventEmitter.on('servicesChanged', callback);
  },
  
  offServicesChanged: (callback: Function) => {
    eventEmitter.off('servicesChanged', callback);
  },
  
  // Precargar datos comunes
  preloadCommonData: async () => {
    const commonEndpoints = [
      '/administrators',
      '/buildings',
      '/technicians',
      '/payment-methods'
    ];
    
    const promises = commonEndpoints.map(endpoint => 
      cachedApi.get(endpoint).catch(() => null)
    );
    
    await Promise.all(promises);
  }
};

export default api; 