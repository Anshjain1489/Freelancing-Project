const express = require('express');
const chatbotController = require('../controllers/chatbot.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { chatbotLimiter } = require('../middleware/chatbotRateLimit.middleware');

const router = express.Router();

router.post('/messages', chatbotLimiter, optionalAuth, chatbotController.sendMessage);

module.exports = router;
