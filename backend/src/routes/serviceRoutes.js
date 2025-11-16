const express = require('express');
const router = express.Router();
const { 
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  saveDraft,
  assignTechnician,
  uploadReceipt,
  createInvoice,
  createInformalInvoice,
  createInformalInvoiceMultiple,
  importInvoice,
  importInvoiceMultiple,
  getTechnicians,
  getServiceCounts,
  getServiceStats,
  getAssignedServicesForTechnician,
  cancelService
} = require('../controllers/serviceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Rutas protegidas que requieren autenticación
router.use(authMiddleware);

// Ruta para obtener conteos
router.get('/counts', getServiceCounts);

// Ruta para estadísticas
router.get('/stats', getServiceStats);

// Ruta para que el técnico vea solo sus trabajos asignados
router.get('/assigned', (req, res, next) => {
  console.log('[ROUTE] GET /assigned - Usuario:', req.user);
  next();
}, roleMiddleware(['TECNICO', 'ADMIN', 'OPERADOR']), getAssignedServicesForTechnician);

// Rutas que requieren rol ADMIN u OPERADOR
router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getAllServices);
router.get('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), getServiceById);
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), createService);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), updateService);
router.delete('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), deleteService);
router.get('/technicians', roleMiddleware(['ADMIN', 'OPERADOR']), getTechnicians);

// Ruta para guardar borradores
router.post('/draft', saveDraft);

// ============================================
// RUTAS BULK (deben ir ANTES de las rutas con :id)
// ============================================

// Ruta para crear cobro sin factura múltiple (solo ADMIN u OPERADOR)
router.post('/bulk/informal-invoice', roleMiddleware(['ADMIN', 'OPERADOR']), createInformalInvoiceMultiple);

// Ruta para importar factura múltiple (solo ADMIN u OPERADOR)
router.post('/bulk/import-invoice', (req, res, next) => {
  console.log('[ROUTE] POST /bulk/import-invoice llamada');
  next();
}, roleMiddleware(['ADMIN', 'OPERADOR']), (req, res, next) => {
  console.log('[ROUTE] Pasando por roleMiddleware, req.user:', req.user);
  next();
}, upload.single('invoice'), (req, res, next) => {
  console.log('[ROUTE] Archivo recibido:', req.file);
  next();
}, importInvoiceMultiple);

// ============================================
// RUTAS INDIVIDUALES (con parámetro :id)
// ============================================

// Ruta para asignar técnico (solo ADMIN u OPERADOR)
router.post('/:id/assign', roleMiddleware(['ADMIN', 'OPERADOR']), assignTechnician);

// Ruta para subir remito (solo TECNICO asignado)
router.post('/:id/receipt', (req, res, next) => {
  console.log('[ROUTE] POST /:id/receipt llamada');
  next();
}, roleMiddleware(['TECNICO', 'ADMIN', 'OPERADOR']), (req, res, next) => {
  console.log('[ROUTE] Pasando por roleMiddleware, req.user:', req.user);
  next();
}, upload.array('receipts'), (req, res, next) => {
  console.log('[ROUTE] Archivos recibidos:', req.files);
  next();
}, uploadReceipt);

// Ruta para anular servicio (solo TECNICO asignado)
router.post('/:id/cancel', roleMiddleware(['TECNICO', 'ADMIN', 'OPERADOR']), cancelService);

// Ruta para crear factura (solo ADMIN u OPERADOR)
router.post('/:id/invoice', roleMiddleware(['ADMIN', 'OPERADOR']), createInvoice);

// Ruta para crear cobro sin factura individual (solo ADMIN u OPERADOR)
router.post('/:id/informal-invoice', roleMiddleware(['ADMIN', 'OPERADOR']), createInformalInvoice);

// Ruta para importar factura individual (solo ADMIN u OPERADOR)
router.post('/:id/import-invoice', (req, res, next) => {
  console.log('[ROUTE] POST /:id/import-invoice llamada');
  next();
}, roleMiddleware(['ADMIN', 'OPERADOR']), (req, res, next) => {
  console.log('[ROUTE] Pasando por roleMiddleware, req.user:', req.user);
  next();
}, upload.single('invoice'), (req, res, next) => {
  console.log('[ROUTE] Archivo recibido:', req.file);
  next();
}, importInvoice);

module.exports = router; 