"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useEffect } from 'react';
import api from '@/lib/axios';

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
      const response = await api.get('/services/counts');
      setCounts(response.data);
    } catch (error) {
      // Opcional: manejar error
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return (
    <ServiceCountsContext.Provider value={{ counts, refreshCounts: fetchCounts }}>
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