const rateLimit = require('express-rate-limit');

const chatbotLimiter = rateLimit({
  windowMs: parseInt(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000, // 1 minute
  max: parseInt(process.env.CHATBOT_RATE_LIMIT_MAX_REQUESTS, 10) || 20, // max 20 requests per minute
  message: {
    success: false,
    message: 'You are sending messages a little too quickly 😊 Please wait a moment and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { chatbotLimiter };
