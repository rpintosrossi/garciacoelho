'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[TEST] Test page loaded');
    
    // Obtener información de debug
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => {
        console.log('[TEST] Debug info received:', data);
        setDebugInfo(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[TEST] Error fetching debug info:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🔍 Test de Railway</h1>
      <p>La aplicación está funcionando correctamente</p>
      
      <h2>Información del Entorno</h2>
      <ul>
        <li><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</li>
        <li><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</li>
        <li><strong>NEXT_PUBLIC_APP_URL:</strong> {process.env.NEXT_PUBLIC_APP_URL}</li>
        <li><strong>Timestamp:</strong> {new Date().toISOString()}</li>
      </ul>

      <h2>Información de Debug del Servidor</h2>
      {loading ? (
        <p>Cargando información de debug...</p>
      ) : debugInfo ? (
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px',
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      ) : (
        <p style={{ color: 'red' }}>Error al cargar información de debug</p>
      )}

      <p style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#007bff' }}>← Volver al inicio</a>
      </p>
    </div>
  );
} 