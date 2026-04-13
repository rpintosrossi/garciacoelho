const express = require('express');
const router = express.Router();
const { getQuickStats, getBuildingsWithOverdueDebts, getPaymentsByMethod } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener estadísticas rápidas
router.get('/quick-stats', getQuickStats);

// Pagos por método de pago mensual
router.get('/payments-by-method', getPaymentsByMethod);

// Obtener edificios con deudas vencidas
router.get('/overdue-debts', getBuildingsWithOverdueDebts);

module.exports = router; 