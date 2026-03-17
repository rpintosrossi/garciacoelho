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
  getPendingInvoices,
  getAvailableLocalities,
  getBuildingAccountDetails,
  createBuildingPayment,
  getBuildingServiceHistory,
  searchBuildingsAutocomplete
} = require('../controllers/buildingController');

// Rutas protegidas con autenticación y roles
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildings);
router.get('/search/autocomplete', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), searchBuildingsAutocomplete);
router.get('/localities/available', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getAvailableLocalities);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingById);
router.get('/:id/service-history', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingServiceHistory);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), createBuilding);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), updateBuilding);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), deleteBuilding);
router.get('/:id/account', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingAccount);
router.get('/:id/account-movements', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingAccountMovements);
router.get('/:id/pending-invoices', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getPendingInvoices);
router.get('/:id/account-details', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingAccountDetails);
router.post('/:id/payment', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), createBuildingPayment);

module.exports = router; 