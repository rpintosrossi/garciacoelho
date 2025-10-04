const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Rutas de productos
router.get('/', productController.getProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.patch('/:id/quantity', productController.updateProductQuantity);
router.delete('/:id', productController.deleteProduct);

module.exports = router;

