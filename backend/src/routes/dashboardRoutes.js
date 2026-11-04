const express = require('express');
const router = express.Router();
const { getQuickStats, getBuildingsWithOverdueDebts, getPaymentsByMethod, getInvoicedVsCollected, getFastPaymentAdmins, getTopTechnicians } = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener estadísticas rápidas
router.get('/quick-stats', getQuickStats);

// Pagos por método de pago mensual
router.get('/payments-by-method', getPaymentsByMethod);

// Facturado vs Cobrado mensual
router.get('/invoiced-vs-collected', getInvoicedVsCollected);

// Top admins pagos más rápidos
router.get('/fast-payment-admins', getFastPaymentAdmins);

// Top técnicos por cantidad de servicios
router.get('/top-technicians', getTopTechnicians);

// Obtener edificios con deudas vencidas
router.get('/overdue-debts', getBuildingsWithOverdueDebts);

module.exports = router; 