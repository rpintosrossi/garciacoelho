const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryByName
} = require('../controllers/categoryController');

// Rutas protegidas con autenticación
router.use(authMiddleware);

// Obtener todas las categorías
router.get('/', getCategories);

// Obtener una categoría por ID
router.get('/:id', getCategoryById);

// Obtener una categoría por nombre
router.get('/name/:name', getCategoryByName);

// Crear nueva categoría (solo ADMIN y OPERADOR)
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createCategory);

// Actualizar categoría (solo ADMIN y OPERADOR)
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateCategory);

// Eliminar categoría (solo ADMIN)
router.delete('/:id', roleMiddleware(['ADMIN']), deleteCategory);

module.exports = router;
