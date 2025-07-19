const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas de clientes
router.get('/', authMiddleware, clientController.getClients);
router.get('/:id', authMiddleware, clientController.getClientById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), clientController.createClient);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'OPERADOR']), clientController.updateClient);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), clientController.deleteClient);

module.exports = router; 