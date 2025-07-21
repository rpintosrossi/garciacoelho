export default function HealthPage() {
  return (
    <html>
      <head>
        <title>Health Check</title>
      </head>
      <body style={{ 
        margin: 0,
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>
          <h1>OK</h1>
          <p>Status: Healthy</p>
          <p>Timestamp: {new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  );
} 