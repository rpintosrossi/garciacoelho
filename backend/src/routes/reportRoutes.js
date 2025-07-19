const express = require('express');
const router = express.Router();
const { getAdminDebtReport, getBuildingDebtReport } = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Reporte de deuda de administradores
router.get('/admin-debt', roleMiddleware(['ADMIN', 'OPERADOR']), getAdminDebtReport);

// Reporte de deuda de edificios
router.get('/building-debt', roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingDebtReport);

module.exports = router; 