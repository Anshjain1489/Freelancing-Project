import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const userService = {
  getProfile: async () => {
    const response = await apiClient.get(ENDPOINTS.USER.PROFILE);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.patch(ENDPOINTS.USER.UPDATE_PROFILE, profileData);
    return response.data;
  }
};
