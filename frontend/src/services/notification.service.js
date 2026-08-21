import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const notificationService = {
  getUserNotifications: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.LIST, { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  },

  getPreferences: async () => {
    const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
    return response.data;
  },

  updatePreferences: async (preferences) => {
    const response = await apiClient.patch(ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
    return response.data;
  }
};
