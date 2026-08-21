const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const chatbotService = require('../services/chatbot/chatbot.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;
  const sessionId = req.body.sessionId || 'guest_session';
  const message = req.body.message || '';

  if (!message || message.trim().length === 0) {
    return ApiResponse.error(res, HTTP_STATUS.BAD_REQUEST, 'Message content is required');
  }

  const result = await chatbotService.processUserMessage({
    userId,
    sessionId,
    message
  });

  return ApiResponse.success(res, HTTP_STATUS.OK, 'AI Chatbot response generated', result);
});

module.exports = { sendMessage };
