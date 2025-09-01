const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Importar el controlador completo
const zoneController = require('../controllers/zoneController');

// Obtener todas las zonas
router.get('/', authMiddleware, zoneController.getZones);

// Obtener localidades disponibles (debe ir antes que /:id)
router.get('/localities/available', authMiddleware, zoneController.getAvailableLocalities);

// Obtener una zona por ID
router.get('/:id', authMiddleware, zoneController.getZoneById);

// Crear una nueva zona
router.post('/', authMiddleware, zoneController.createZone);

// Actualizar una zona
router.put('/:id', authMiddleware, zoneController.updateZone);

// Eliminar una zona
router.delete('/:id', authMiddleware, zoneController.deleteZone);

module.exports = router;
