const express = require('express');
const router = express.Router();
const workshopRepairController = require('../controllers/workshopRepairController');
const { authMiddleware } = require('../middleware/auth');

// Rutas de reparaciones en talleres
router.get('/', authMiddleware, workshopRepairController.getWorkshopRepairs);
router.get('/:id', authMiddleware, workshopRepairController.getWorkshopRepairById);
router.post('/', authMiddleware, workshopRepairController.createWorkshopRepair);
router.put('/:id', authMiddleware, workshopRepairController.updateWorkshopRepair);
router.delete('/:id', authMiddleware, workshopRepairController.deleteWorkshopRepair);

module.exports = router;
