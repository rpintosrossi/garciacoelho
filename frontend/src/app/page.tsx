'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Delay más largo para permitir que el healthcheck funcione
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <h1>Garcia Coelho</h1>
      <p>Sistema de gestión de servicios</p>
      <p>Cargando...</p>
    </div>
  );
}
