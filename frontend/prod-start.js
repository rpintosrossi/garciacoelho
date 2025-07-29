const { spawn } = require('child_process');

console.log('[Custom Start] Starting application...');

const env = {
  ...process.env,
  HOSTNAME: '0.0.0.0', // Forzar que escuche en todas las interfaces
};

console.log(`[Custom Start] Starting with PORT: ${env.PORT || 'not set, will default'}`);
console.log(`[Custom Start] Starting with HOSTNAME: ${env.HOSTNAME}`);

const child = spawn('node', ['.next/standalone/server.js'], {
  stdio: 'inherit', // Mostrar todos los logs del proceso hijo
  env: env
});

child.on('error', (error) => {
  console.error('[Custom Start] CRITICAL: Failed to spawn server process:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  // Este log es clave. Nos dirá si la app crasheó y por qué.
  console.log(`[Custom Start] Server process exited with code ${code} and signal ${signal}`);
  process.exit(code);
});

console.log('[Custom Start] Spawned child process successfully.'); 