const express = require('express');
const router = express.Router();
const { getAdminDebtReport, getBuildingDebtReport, getAdminDebtPDF, getNoChargeStats } = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Reporte de deuda de administradores
router.get('/admin-debt', roleMiddleware(['ADMIN', 'OPERADOR']), getAdminDebtReport);

// PDF de deuda de administrador
router.get('/admin-debt/:id/pdf', roleMiddleware(['ADMIN', 'OPERADOR']), getAdminDebtPDF);

// Reporte de deuda de edificios
router.get('/building-debt', roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingDebtReport);

// Estadísticas por motivos de Sin Cobro Económico
router.get('/no-charge-stats', roleMiddleware(['ADMIN', 'OPERADOR']), getNoChargeStats);

module.exports = router; 