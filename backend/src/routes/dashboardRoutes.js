const express = require('express');
const router = express.Router();
const { getQuickStats } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener estadísticas rápidas
router.get('/quick-stats', getQuickStats);

module.exports = router; 