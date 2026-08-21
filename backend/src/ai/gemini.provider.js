const axios = require('axios');
const logger = require('../utils/logger');
const { getSystemPrompt } = require('./aiPrompt.service');

const getAIConfig = () => {
  return {
    enabled: process.env.AI_ENABLED !== 'false',
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash'
  };
};

/**
 * Generates an AI response via Gemini REST API or uses smart fallback rule engine if API key is not configured.
 */
const generateAIResponse = async (userMessage, toolResults = {}) => {
  const config = getAIConfig();

  // Smart fallback response generator when API key is not set in development mode
  if (!config.enabled || !config.apiKey) {
    return generateFallbackAIResponse(userMessage, toolResults);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    const systemPrompt = getSystemPrompt();

    const promptText = `${systemPrompt}\n\nVERIFIED BACKEND CONTEXT / TOOL RESULTS:\n${JSON.stringify(toolResults, null, 2)}\n\nUSER MESSAGE:\n${userMessage}`;

    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: promptText }]
      }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });

    const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (aiText) {
      return aiText;
    }
    return generateFallbackAIResponse(userMessage, toolResults);
  } catch (err) {
    logger.error(`[GEMINI_API_ERROR] ${err.message}`);
    return generateFallbackAIResponse(userMessage, toolResults);
  }
};

const generateFallbackAIResponse = (userMessage, toolResults) => {
  const textLower = userMessage.toLowerCase();

  if (toolResults.products && toolResults.products.length > 0) {
    return `Here are the matching grocery items available at Chaudhary Kirana Store 🛒`;
  }

  if (textLower.includes('delivery') || textLower.includes('charge')) {
    return `Delivery is ₹10 per KM (minimum ₹10 charge)! 🛵\nMaximum delivery radius is 15 KM.`;
  }

  if (textLower.includes('contact') || textLower.includes('phone') || textLower.includes('where') || textLower.includes('address')) {
    return `📍 Store Address: Near Bada Jain Mandir, Tikamgarh Road, Mahruni.\n📞 Phone: +91 7897837095 / +91 7007550184 (Akash Chaudhary).\nWe are open daily for fresh local grocery delivery! 🌾`;
  }

  if (textLower.includes('offer') || textLower.includes('discount') || textLower.includes('coupon')) {
    return `🎉 Current Offers at Chaudhary Kirana Store:\n• Use coupon MAHRUNI50 for special local discounts!\n• Fast local delivery at ₹10 per KM.`;
  }

  if (toolResults.order) {
    return `📦 Your order #${toolResults.order.orderNumber} is currently: ${toolResults.order.status}! (Payment: ${toolResults.order.paymentStatus})`;
  }

  return `Hello! 👋 How can I help you today? You can ask me to find products (Atta, Oil, Milk, Snacks), check delivery charges, or view current store offers 🛒`;
};

module.exports = {
  getAIConfig,
  generateAIResponse
};
