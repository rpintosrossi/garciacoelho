const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/noChargeReasonController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', roleMiddleware(['ADMIN', 'OPERADOR']), getAll);
router.post('/', roleMiddleware(['ADMIN', 'OPERADOR']), create);
router.put('/:id', roleMiddleware(['ADMIN', 'OPERADOR']), update);
router.delete('/:id', roleMiddleware(['ADMIN']), remove);

module.exports = router;
