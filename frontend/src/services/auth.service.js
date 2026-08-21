import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const authService = {
  login: async (identifier, password) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, { identifier, password });
    return response.data;
  },

  register: async (fullName, phone, email, password) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, { fullName, phone, email, password });
    return response.data;
  },

  googleLogin: async (idToken) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.GOOGLE, { idToken });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get(ENDPOINTS.AUTH.ME);
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {}
  }
};
