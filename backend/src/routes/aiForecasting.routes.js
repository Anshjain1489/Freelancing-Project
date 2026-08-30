const express = require('express');
const router = express.Router();
const aiForecastingController = require('../controllers/aiForecasting.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/demand', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiForecastingController.getDemandForecasts);
router.post('/demand/generate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiForecastingController.generateDemandForecasts);

router.get('/reorders', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiForecastingController.getInventoryReorders);
router.post('/reorders/evaluate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiForecastingController.evaluateInventoryReorders);

router.get('/sales', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiForecastingController.getSalesForecasts);
router.post('/sales/generate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiForecastingController.generateSalesForecasts);

module.exports = router;
