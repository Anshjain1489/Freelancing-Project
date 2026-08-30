const express = require('express');
const router = express.Router();
const aiCopilotController = require('../controllers/aiCopilot.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.post('/query', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiCopilotController.queryCopilot);
router.get('/history', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiCopilotController.getCopilotHistory);

module.exports = router;
