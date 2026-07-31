const express = require('express');
const router = express.Router();
const { testData, testInvoices, getPackages, downloadPackage, getLastPackagePaymentMethod } = require('../controllers/packageController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Endpoint de prueba (sin autenticación para facilitar testing)
router.get('/test', testData);

// Endpoint de prueba para facturas (sin autenticación para facilitar testing)
router.get('/test-invoices', testInvoices);

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Obtener todos los paquetes (solo ADMIN u OPERADOR)
router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getPackages);

// Último método de pago usado para armar paquete de una administración
router.get('/:adminId/last-payment-method', roleMiddleware(['ADMIN', 'OPERADOR']), getLastPackagePaymentMethod);

// Descargar paquete por administrador (solo ADMIN u OPERADOR)
router.get('/:adminId/download', roleMiddleware(['ADMIN', 'OPERADOR']), downloadPackage);

module.exports = router;
