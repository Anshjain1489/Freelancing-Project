const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/calculate', apiLimiter, optionalAuth, deliveryController.calculateDeliveryFee);

module.exports = router;
