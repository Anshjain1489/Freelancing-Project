const supabase = require('../../config/supabase');
const aiProvider = require('../../ai/aiProvider');
const chatbotTools = require('./chatbotTool.service');
const logger = require('../../utils/logger');

const mockConversations = {};

const processUserMessage = async ({ userId = null, sessionId = null, message = '' }) => {
  const textLower = message.toLowerCase().trim();

  // 1. Tool Intent Execution
  const toolResults = {};
  let structuredProducts = [];
  let structuredActions = [];

  // Product Search Detection
  const productKeywords = ['atta', 'oil', 'ghee', 'rice', 'milk', 'snack', 'biscuit', 'soap', 'shampoo', 'tea', 'sugar', 'salt', 'dal', 'product', 'buy', 'find', 'show'];
  const hasProductQuery = productKeywords.some(k => textLower.includes(k));

  if (hasProductQuery || textLower.includes('under')) {
    // Extract price constraint if user asks "under 100" or "under ₹200"
    let maxPrice = null;
    const priceMatch = textLower.match(/(?:under|below|less than)\s*₹?\s*(\d+)/);
    if (priceMatch) {
      maxPrice = parseInt(priceMatch[1], 10);
    }

    const cleanSearch = textLower.replace(/(?:show|me|products?|under|below|less|than|₹|\d+)/g, '').trim();
    const products = await chatbotTools.searchProducts({ search: cleanSearch || 'atta', maxPrice });
    toolResults.products = products;
    structuredProducts = products;

    if (products.length > 0) {
      structuredActions.push({
        type: 'VIEW_CATALOG',
        label: 'Explore Full Catalog 🛒',
        target: '/products'
      });
    }
  }

  // Delivery Query Detection
  if (textLower.includes('delivery') || textLower.includes('km') || textLower.includes('charge')) {
    const distMatch = textLower.match(/(\d+(?:\.\d+)?)\s*km/);
    const distanceKm = distMatch ? parseFloat(distMatch[1]) : 1.0;
    const deliveryInfo = chatbotTools.getDeliveryInfo({ distanceKm });
    toolResults.delivery = deliveryInfo;
  }

  // Order Status Query Detection (Authenticated User)
  if (textLower.includes('order') || textLower.includes('track') || textLower.includes('status')) {
    if (userId) {
      const latestOrder = await chatbotTools.getUserLatestOrder(userId);
      toolResults.order = latestOrder;
      if (latestOrder) {
        structuredActions.push({
          type: 'VIEW_ORDER',
          label: `Track Order #${latestOrder.orderNumber}`,
          target: `/orders/${latestOrder.id}`
        });
      }
    } else {
      structuredActions.push({
        type: 'LOGIN_REQUIRED',
        label: 'Login to View Orders 🔑',
        target: '/login'
      });
    }
  }

  // Store Contact Info Detection
  if (textLower.includes('address') || textLower.includes('phone') || textLower.includes('contact') || textLower.includes('owner')) {
    toolResults.storeInfo = chatbotTools.getStoreInfo();
  }

  // 2. Synthesize Response via Backend AI Provider
  const aiTextMessage = await aiProvider.chat(message, toolResults);

  // 3. Persist Conversation & Messages if Supabase Connected
  let conversationId = `conv-${Date.now()}`;
  if (supabase) {
    let { data: conv } = await supabase.from('chatbot_conversations')
      .select('id')
      .or(`user_id.eq.${userId || '00000000-0000-0000-0000-000000000000'},session_id.eq.${sessionId || 'guest'}`)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase.from('chatbot_conversations').insert([{
        user_id: userId || null,
        session_id: sessionId || 'guest',
        title: message.slice(0, 50)
      }]).select().single();
      conv = newConv;
    }

    if (conv) {
      conversationId = conv.id;
      // Save User Message
      await supabase.from('chatbot_messages').insert([{
        conversation_id: conv.id,
        role: 'USER',
        content: message
      }]);

      // Save Assistant Message
      await supabase.from('chatbot_messages').insert([{
        conversation_id: conv.id,
        role: 'ASSISTANT',
        content: aiTextMessage,
        structured_data: { products: structuredProducts, actions: structuredActions }
      }]);
    }
  }

  return {
    conversationId,
    message: aiTextMessage,
    products: structuredProducts,
    actions: structuredActions
  };
};

module.exports = { processUserMessage };
