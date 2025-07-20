export default function TestPage() {
  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1>✅ Test de Railway</h1>
      <p>La aplicación está funcionando correctamente</p>
      <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      <p><strong>Puerto:</strong> {process.env.PORT || 'No definido'}</p>
      <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
      <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
    </div>
  );
} 