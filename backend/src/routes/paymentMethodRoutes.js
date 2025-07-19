const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod
} = require('../controllers/paymentMethodController');

router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), getPaymentMethods);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), createPaymentMethod);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), updatePaymentMethod);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), deletePaymentMethod);

module.exports = router; 