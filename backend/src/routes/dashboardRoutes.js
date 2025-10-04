const express = require('express');
const router = express.Router();
const { getQuickStats, getBuildingsWithOverdueDebts } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener estadísticas rápidas
router.get('/quick-stats', getQuickStats);

// Obtener edificios con deudas vencidas
router.get('/overdue-debts', getBuildingsWithOverdueDebts);

module.exports = router; 