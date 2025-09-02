const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Importar el controlador completo
const zoneController = require('../controllers/zoneController');

// Obtener todas las zonas
router.get('/', authMiddleware, zoneController.getZones);

// Obtener localidades disponibles (debe ir antes que /:id)
router.get('/localities/available', authMiddleware, zoneController.getAvailableLocalities);

// Obtener todas las localidades predefinidas (útil para crear la primera zona)
router.get('/localities/predefined', authMiddleware, zoneController.getAllPredefinedLocalities);

// Crear localidad personalizada
router.post('/localities', authMiddleware, zoneController.createCustomLocality);

// Obtener una zona por ID
router.get('/:id', authMiddleware, zoneController.getZoneById);

// Obtener localidades de una zona específica
router.get('/:zoneId/localities', authMiddleware, zoneController.getZoneLocalities);

// Crear una nueva zona
router.post('/', authMiddleware, zoneController.createZone);

// Agregar localidad a una zona
router.post('/:zoneId/localities', authMiddleware, zoneController.addLocalityToZone);

// Actualizar una zona
router.put('/:id', authMiddleware, zoneController.updateZone);

// Eliminar una zona
router.delete('/:id', authMiddleware, zoneController.deleteZone);

// Eliminar localidad de una zona
router.delete('/:zoneId/localities/:localityId', authMiddleware, zoneController.removeLocalityFromZone);

module.exports = router;
