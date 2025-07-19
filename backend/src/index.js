const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const administratorRoutes = require('./routes/administratorRoutes');
const clientRoutes = require('./routes/clientRoutes');
const path = require('path');

dotenv.config();

const app = express();

// Middleware para logging de todas las peticiones
app.use((req, res, next) => {
  console.log('\n[REQUEST] Nueva petición recibida');
  console.log('[REQUEST] Método:', req.method);
  console.log('[REQUEST] URL:', req.originalUrl);
  console.log('[REQUEST] Headers:', req.headers);
  console.log('[REQUEST] Body:', req.body);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/administrators', administratorRoutes);
app.use('/api/clients', clientRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
}); 