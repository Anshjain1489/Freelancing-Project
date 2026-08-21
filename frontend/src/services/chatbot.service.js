import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const chatbotService = {
  sendMessage: async (message, sessionId = 'guest_session') => {
    const response = await apiClient.post(ENDPOINTS.CHATBOT.SEND_MESSAGE, {
      message,
      sessionId
    });
    return response.data;
  }
};
