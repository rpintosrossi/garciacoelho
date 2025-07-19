const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingAccount,
  getBuildingAccountMovements,
  getPendingInvoices
} = require('../controllers/buildingController');

// Rutas protegidas con autenticación y roles
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildings);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), createBuilding);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), updateBuilding);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), deleteBuilding);
router.get('/:id/account', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingAccount);
router.get('/:id/account-movements', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingAccountMovements);
router.get('/:id/pending-invoices', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getPendingInvoices);

module.exports = router; 