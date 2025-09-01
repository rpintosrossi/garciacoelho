"use client";
import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useEffect } from 'react';
import { cachedApi } from '@/lib/axios';

export interface ServiceCount {
  pendientes: number;
  asignados: number;
  conRemito: number;
  facturados: number;
}

interface ServiceCountsContextType {
  counts: ServiceCount;
  refreshCounts: () => Promise<void>;
}

const ServiceCountsContext = createContext<ServiceCountsContextType | undefined>(undefined);

export function ServiceCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<ServiceCount>({
    pendientes: 0,
    asignados: 0,
    conRemito: 0,
    facturados: 0,
  });

  const fetchCounts = useCallback(async () => {
    try {
      const response = await cachedApi.get('/services/counts');
      setCounts(response.data);
    } catch (error) {
      // Opcional: manejar error
    }
  }, []);

  useEffect(() => {
    // Solo cargar una vez al inicializar, no en intervalos
    fetchCounts();
  }, [fetchCounts]);

  // Memoizar el valor del contexto para evitar re-renderizados innecesarios
  const contextValue = useMemo(() => ({
    counts,
    refreshCounts: fetchCounts
  }), [counts, fetchCounts]);

  return (
    <ServiceCountsContext.Provider value={contextValue}>
      {children}
    </ServiceCountsContext.Provider>
  );
}

export function useServiceCounts() {
  const context = useContext(ServiceCountsContext);
  if (!context) {
    throw new Error('useServiceCounts debe usarse dentro de ServiceCountsProvider');
  }
  return context;
} 