const express = require('express');
const router = express.Router();
const { 
  getAllServiceTypes, 
  createServiceType, 
  updateServiceType, 
  deleteServiceType 
} = require('../controllers/serviceTypeController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de lectura (todos los usuarios autenticados)
router.get('/', getAllServiceTypes);

// Rutas de administración (solo ADMIN y OPERADOR)
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createServiceType);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateServiceType);
router.delete('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), deleteServiceType);

module.exports = router;
