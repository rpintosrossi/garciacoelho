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
  getTechnicians,
  getServiceCounts,
  getServiceStats,
  getAssignedServicesForTechnician,
  cancelService
} = require('../controllers/serviceController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Aceptar imágenes y PDFs
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
      return cb(new Error('Solo se permiten archivos de imagen o PDF'));
    }
    cb(null, true);
  }
});

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

module.exports = router; 