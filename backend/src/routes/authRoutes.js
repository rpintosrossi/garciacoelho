const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas públicas
router.post('/login', login);
router.post('/register', authMiddleware, roleMiddleware(['ADMIN']), register);

// Nuevo endpoint para obtener los datos del usuario autenticado
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
});

module.exports = router; 