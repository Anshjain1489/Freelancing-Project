const { generateAIResponse } = require('./gemini.provider');

const aiProvider = {
  chat: async (userMessage, toolResults = {}) => {
    return generateAIResponse(userMessage, toolResults);
  }
};

module.exports = aiProvider;
