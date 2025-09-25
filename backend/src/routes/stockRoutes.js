const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  updateStockQuantity,
  deleteStockItem,
  getStockStats,
  getLowStockItems
} = require('../controllers/stockController');

// Rutas protegidas con autenticación
router.use(authMiddleware);

// Obtener todos los items de stock
router.get('/', getStockItems);

// Obtener estadísticas de stock
router.get('/stats', getStockStats);

// Obtener productos con stock bajo
router.get('/low-stock', getLowStockItems);

// Obtener un item de stock por ID
router.get('/:id', getStockItemById);

// Crear nuevo item de stock (solo ADMIN y OPERADOR)
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createStockItem);

// Actualizar item de stock (solo ADMIN y OPERADOR)
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateStockItem);

// Actualizar solo la cantidad de stock (solo ADMIN y OPERADOR)
router.patch('/:id/quantity', roleMiddleware(['ADMIN', 'OPERADOR']), updateStockQuantity);

// Eliminar item de stock (solo ADMIN)
router.delete('/:id', roleMiddleware(['ADMIN']), deleteStockItem);

module.exports = router;
