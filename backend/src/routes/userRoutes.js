const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Rutas que requieren rol ADMIN u OPERADOR
router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getUsers);
router.get('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), getUserById);
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createUser);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateUser);
router.delete('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), deleteUser);

module.exports = router; 