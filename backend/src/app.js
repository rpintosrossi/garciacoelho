const express = require('express');
const cors = require('cors');
const path = require('path');
const mainRoutes = require('./routes/index');
const initUploads = require('./utils/initUploads');

const app = express();

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  console.log('[SERVER] Headers:', req.headers);
  console.log('[SERVER] Body:', req.body);
  next();
});

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Servir archivos estáticos de /uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.use('/api', mainRoutes);

// Inicializar carpeta de uploads
initUploads();

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('[SERVER] Error:', err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app; 