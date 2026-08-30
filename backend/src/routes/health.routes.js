const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

router.get('/', healthController.getHealth);
router.get('/live', healthController.getLiveness);
router.get('/ready', healthController.getReadiness);
router.get('/version', healthController.getVersion);

module.exports = router;
