const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getAllTechnicians,
  getTechnicianById,
  createTechnician,
  updateTechnician,
  deleteTechnician,
} = require('../controllers/technicianController');

// Rutas públicas
router.get('/', getAllTechnicians);
router.get('/:id', getTechnicianById);

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware, createTechnician);
router.put('/:id', authMiddleware, updateTechnician);
router.delete('/:id', authMiddleware, deleteTechnician);

module.exports = router; 