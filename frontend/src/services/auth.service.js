import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const authService = {
  login: async (identifier, password) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, { identifier, password });
    return response?.data || response;
  },

  register: async (fullName, phone, email, password) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, { fullName, phone, email, password });
    return response?.data || response;
  },

  googleLogin: async (idToken) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.GOOGLE, { idToken });
    return response?.data || response;
  },

  getMe: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.ME);
    return response?.data || response;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return response?.data || response;
  },

  logout: async () => {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {}
  }
};
