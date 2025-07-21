const { spawn } = require('child_process');

const port = process.env.PORT || 3001;

console.log(`Starting Next.js server on port ${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Host: 0.0.0.0`);

const child = spawn('npx', ['next', 'start', '-p', port.toString(), '-H', '0.0.0.0'], {
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