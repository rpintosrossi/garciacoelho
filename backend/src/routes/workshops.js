const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshopController');
const { authMiddleware } = require('../middleware/auth');

// Rutas de talleres
router.get('/', authMiddleware, workshopController.getWorkshops);
router.post('/', authMiddleware, workshopController.createWorkshop);
router.put('/:id', authMiddleware, workshopController.updateWorkshop);
router.delete('/:id', authMiddleware, workshopController.deleteWorkshop);

module.exports = router;
