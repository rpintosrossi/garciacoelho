export default function TestPage() {
  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <h1>✅ Test de Railway</h1>
      <p>La aplicación está funcionando correctamente</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Puerto: {process.env.PORT || 'No definido'}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
    </div>
  );
} 