const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

// Public webhook route (Signature verified inside controller)
router.post('/razorpay', express.raw({ type: 'application/json' }), webhookController.handleRazorpayWebhook);

module.exports = router;
