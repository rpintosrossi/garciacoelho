const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { getConfig, updateConfig, getIssuers, consultarPersona } = require('../controllers/afipController');

router.use(authMiddleware);

router.get('/config', roleMiddleware(['ADMIN', 'OPERADOR']), getConfig);
router.put('/config', roleMiddleware(['ADMIN']), updateConfig);
router.get('/issuers', roleMiddleware(['ADMIN', 'OPERADOR']), getIssuers);
router.post('/padron', roleMiddleware(['ADMIN', 'OPERADOR']), consultarPersona);

module.exports = router;
