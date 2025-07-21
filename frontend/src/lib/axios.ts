import axios from 'axios';
import { config } from './config';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Interceptor para agregar el token a todas las peticiones
api.interceptors.request.use((config) => {
  const fullUrl = `${config.baseURL}${config.url}`;
  console.log('[AXIOS] Realizando petición:', {
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    fullUrl,
    headers: config.headers,
    data: config.data
  });
  
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
    console.log('[AXIOS] Respuesta recibida:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('[AXIOS] Error en la respuesta:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default api; 