import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const adminService = {
  getDashboard: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.DASHBOARD, { params });
    return response.data;
  },

  getRevenueAnalytics: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.ANALYTICS_REVENUE, { params });
    return response.data;
  },

  getTopProductsAnalytics: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.ANALYTICS_TOP_PRODUCTS, { params });
    return response.data;
  },

  getProducts: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.PRODUCTS, { params });
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.PRODUCTS, productData);
    return response.data;
  },

  updateProduct: async (id, updateData) => {
    const response = await apiClient.patch(ENDPOINTS.ADMIN.PRODUCT_BY_ID(id), updateData);
    return response.data;
  },

  getInventory: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.INVENTORY, { params });
    return response.data;
  },

  adjustStock: async (productId, quantityChange, reason = 'RESTOCK') => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.ADJUST_INVENTORY(productId), { quantityChange, reason });
    return response.data;
  },

  getOrders: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.ORDERS, { params });
    return response.data;
  },

  getUnresolvedOrders: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.UNRESOLVED_ORDERS);
    return response.data;
  },

  acceptOrder: async (id) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.ACCEPT_ORDER(id));
    return response.data;
  },

  rejectOrder: async (id, reason) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REJECT_ORDER(id), { reason });
    return response.data;
  },

  retryRefund: async (id) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.RETRY_REFUND(id));
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await apiClient.patch(ENDPOINTS.ADMIN.UPDATE_ORDER_STATUS(id), { status });
    return response.data;
  },

  getCustomers: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.CUSTOMERS, { params });
    return response.data;
  },

  getPayments: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.PAYMENTS, { params });
    return response.data;
  },

  getPromotions: async () => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.PROMOTIONS);
    return response.data;
  },

  createPromotion: async (promoData) => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.PROMOTIONS, promoData);
    return response.data;
  },

  getActivityLogs: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.ACTIVITY, { params });
    return response.data;
  }
};
