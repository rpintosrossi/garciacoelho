'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import api from '@/lib/axios';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<{ user: User; token: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      if (initialized) return; // Evitar múltiples inicializaciones
      
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.log('[AUTH] Token inválido, removiendo del localStorage');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
      setInitialized(true);
    };

    initializeAuth();
  }, [initialized]);

  const login = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Intentando login para:', email);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      console.log('[AUTH] Login exitoso para:', user.email);
      localStorage.setItem('token', token);
      setUser(user);
      return response.data;
    } catch (error: any) {
      console.error('[AUTH] Error en login:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        type: error.response?.data?.type
      });
      
      // Mejorar el mensaje de error
      let errorMessage = 'Error al iniciar sesión';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Credenciales inválidas';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error en el servidor';
      } else if (!error.response) {
        errorMessage = 'No se pudo conectar con el servidor';
      }
      
      const enhancedError: any = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Memoizar el valor del contexto para evitar re-renderizados innecesarios
  const contextValue = useMemo(() => ({
    user,
    loading,
    initialized,
    login,
    logout
  }), [user, loading, initialized]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
} 