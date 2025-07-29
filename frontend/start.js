const { spawn } = require('child_process');

const port = process.env.PORT || 8080;

console.log(`Starting Next.js standalone server on port ${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Host: 0.0.0.0`);

const child = spawn('node', ['.next/standalone/server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port.toString(),
    HOST: '0.0.0.0'
  }
});

child.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
}); 