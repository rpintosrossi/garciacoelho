'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    console.log('[PAGE] Home page loaded');
    console.log('[PAGE] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    });
  }, []);

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
      <p>✅ Aplicación funcionando correctamente</p>
      <p style={{ fontSize: '14px', marginTop: '20px', color: '#666' }}>
        <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
          Ir al login →
        </a>
      </p>
      <p style={{ fontSize: '12px', marginTop: '10px', color: '#999' }}>
        <a href="/api/debug" style={{ color: '#666', textDecoration: 'none' }}>
          Debug Info
        </a>
      </p>
    </div>
  );
}
