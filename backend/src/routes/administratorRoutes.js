const express = require('express');
const router = express.Router();
const { 
  getAdministrators, 
  getAdministratorById, 
  createAdministrator, 
  updateAdministrator, 
  deleteAdministrator,
  getBuildingsBalances,
  getPendingInvoicesForAdmin,
  createAdminMassivePayment
} = require('../controllers/administratorController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Rutas que requieren rol ADMIN u OPERADOR
router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getAdministrators);
router.get('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), getAdministratorById);
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createAdministrator);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateAdministrator);
router.delete('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), deleteAdministrator);
router.get('/:id/buildings-balances', roleMiddleware(['ADMIN', 'OPERADOR']), getBuildingsBalances);
router.get('/:id/pending-invoices', roleMiddleware(['ADMIN', 'OPERADOR']), getPendingInvoicesForAdmin);
router.post('/:id/massive-payment', roleMiddleware(['ADMIN', 'OPERADOR']), createAdminMassivePayment);

module.exports = router; 