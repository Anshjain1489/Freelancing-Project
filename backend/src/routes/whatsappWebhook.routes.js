const express = require('express');
const whatsappWebhookController = require('../controllers/whatsappWebhook.controller');

const router = express.Router();

// GET verification for WhatsApp Hub setup
router.get('/whatsapp', whatsappWebhookController.verifyWebhook);

// POST status updates for WhatsApp deliveries
router.post('/whatsapp', express.raw({ type: 'application/json' }), whatsappWebhookController.handleWebhookEvent);

module.exports = router;
