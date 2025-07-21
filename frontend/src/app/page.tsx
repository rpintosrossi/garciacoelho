'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Solo redirigir después de un delay más largo
    const timer = setTimeout(() => {
      router.push('/login');
    }, 5000);

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
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1>Garcia Coelho</h1>
      <p>Sistema de gestión de servicios</p>
      <p>Redirigiendo al login en 5 segundos...</p>
      <p style={{ fontSize: '14px', marginTop: '20px', color: '#666' }}>
        Si no se redirige automáticamente, haz clic <a href="/login" style={{ color: '#007bff' }}>aquí</a>
      </p>
    </div>
  );
}
