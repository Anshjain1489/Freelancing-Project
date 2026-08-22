import api from '../config/axios';
import { ENDPOINTS } from '../api/endpoints';

export const inventoryService = {
  getInventoryOverview: async (params = {}) => {
    const res = await api.get(ENDPOINTS.ADMIN.INVENTORY, { params });
    return res.data;
  },

  addStock: async (productId, quantity, reason = '') => {
    const res = await api.post(ENDPOINTS.ADMIN.ADD_STOCK(productId), { quantity, reason });
    return res.data;
  },

  removeStock: async (productId, quantity, reason = '') => {
    const res = await api.post(ENDPOINTS.ADMIN.REMOVE_STOCK(productId), { quantity, reason });
    return res.data;
  },

  updateThreshold: async (productId, threshold) => {
    const res = await api.patch(ENDPOINTS.ADMIN.STOCK_THRESHOLD(productId), { threshold });
    return res.data;
  },

  getStockMovements: async (productId = null) => {
    const endpoint = productId ? ENDPOINTS.ADMIN.STOCK_MOVEMENTS(productId) : `${ENDPOINTS.ADMIN.INVENTORY}/movements`;
    const res = await api.get(endpoint);
    return res.data;
  },

  adjustStock: async (productId, quantityChange, reason = '') => {
    const res = await api.post(ENDPOINTS.ADMIN.ADJUST_INVENTORY(productId), { quantityChange, reason });
    return res.data;
  }
};
