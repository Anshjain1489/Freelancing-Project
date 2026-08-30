const express = require('express');
const router = express.Router();
const aiAnomaliesController = require('../controllers/aiAnomalies.controller');
const { authenticate, authorizeRoles, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiAnomaliesController.getAnomalies);
router.post('/scan', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiAnomaliesController.scanAnomalies);
router.post('/:id/resolve', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiAnomaliesController.resolveAnomaly);

module.exports = router;
