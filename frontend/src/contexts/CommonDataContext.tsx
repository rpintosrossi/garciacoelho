'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cachedApi } from '@/lib/axios';

interface Administrator {
  id: string;
  name: string;
  email: string;
  phone: string;
  phones?: string[];
  phoneNames?: string[];
  emails?: string[];
  emailNames?: string[];
  createdAt: string;
  updatedAt: string;
  saldoTotal?: number;
}

interface Building {
  id: string;
  name: string;
  address: string;
  administratorId: string;
  administrator?: Administrator;
  account?: any;
}

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  titular?: string;
}

interface CommonData {
  administrators: Administrator[];
  buildings: Building[];
  technicians: Technician[];
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const CommonDataContext = createContext<CommonData | undefined>(undefined);

export function CommonDataProvider({ children }: { children: ReactNode }) {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommonData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [adminsRes, buildingsRes, techniciansRes, methodsRes] = await Promise.all([
        cachedApi.get('/administrators'),
        cachedApi.get('/buildings'),
        cachedApi.get('/technicians'),
        cachedApi.get('/payment-methods')
      ]);

      setAdministrators(adminsRes.data);
      setBuildings(buildingsRes.data);
      setTechnicians(techniciansRes.data);
      setPaymentMethods(methodsRes.data);
    } catch (err) {
      setError('Error al cargar datos comunes');
      console.error('Error cargando datos comunes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommonData();
  }, []);

  return (
    <CommonDataContext.Provider value={{
      administrators,
      buildings,
      technicians,
      paymentMethods,
      loading,
      error,
      refreshData: fetchCommonData
    }}>
      {children}
    </CommonDataContext.Provider>
  );
}

export function useCommonData() {
  const context = useContext(CommonDataContext);
  if (context === undefined) {
    throw new Error('useCommonData debe ser usado dentro de un CommonDataProvider');
  }
  return context;
}
