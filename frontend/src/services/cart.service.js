import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const cartService = {
  getCart: async () => {
    const response = await apiClient.get(ENDPOINTS.CART.GET);
    return response.data;
  },

  addItem: async (productId, quantity) => {
    const response = await apiClient.post(ENDPOINTS.CART.ADD_ITEM, { productId, quantity });
    return response.data;
  },

  updateQuantity: async (itemId, quantity) => {
    const response = await apiClient.patch(ENDPOINTS.CART.UPDATE_ITEM(itemId), { quantity });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await apiClient.delete(ENDPOINTS.CART.REMOVE_ITEM(itemId));
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.delete(ENDPOINTS.CART.CLEAR);
    return response.data;
  },

  syncGuestCart: async (items) => {
    const response = await apiClient.post(ENDPOINTS.CART.SYNC, { items });
    return response.data;
  }
};
