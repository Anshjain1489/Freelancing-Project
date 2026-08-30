const express = require('express');
const router = express.Router();
const customerAnalyticsController = require('../controllers/customerAnalytics.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

router.get('/overview', authenticate, authorizeAdmin, customerAnalyticsController.getOverviewAnalytics);

module.exports = router;
