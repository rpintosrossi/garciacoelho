const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { 
  getAllInvoices, 
  getInvoiceById, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice 
} = require('../controllers/invoiceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Obtener todas las facturas (solo ADMIN u OPERADOR)
router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getAllInvoices);

// Obtener factura por ID (solo ADMIN u OPERADOR)
router.get('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), getInvoiceById);

// Crear nueva factura (solo ADMIN u OPERADOR)
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createInvoice);

// Actualizar factura (solo ADMIN u OPERADOR)
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), upload.single('file'), updateInvoice);

// Eliminar factura (solo ADMIN)
router.delete('/:id', roleMiddleware(['ADMIN']), deleteInvoice);

module.exports = router;
