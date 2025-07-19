export default function HealthCheck() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <h1>✅ Garcia Coelho Frontend</h1>
      <p>Status: OK</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
} 