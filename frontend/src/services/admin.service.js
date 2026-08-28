import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const adminService = {
  getDashboard: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ADMIN.DASHBOARD, { params });
    return response.data;
  },

  getDashboardOverview: async () => {
    const response = await apiClient.get('/admin/analytics/overview');
    return response.data;
  },

  getSalesAnalytics: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/sales', { params });
    return response.data;
  },

  getRevenueAnalytics: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/sales', { params });
    return response.data;
  },

  getProductAnalytics: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/products', { params });
    return response.data;
  },

  getTopProductsAnalytics: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/products', { params });
    return response.data;
  },

  getInventoryAnalytics: async () => {
    const response = await apiClient.get('/admin/analytics/inventory');
    return response.data;
  },

  // Phase 38 Analytics Exports
  exportAnalyticsCsv: (type, params) => apiClient.get(`/admin/analytics/export/${type}`, { params, responseType: 'blob' }),
  exportAnalyticsPdfReport: () => apiClient.get('/admin/analytics/report/pdf', { responseType: 'text' }),

  // Phase 39 Operations & Reorder Intelligence
  getOperationsOverview: () => apiClient.get('/admin/operations/overview'),
  getReorderRecommendations: (params) => apiClient.get('/admin/reorder-recommendations', { params }),
  triggerReorderRecommendations: () => apiClient.post('/admin/reorder-recommendations/calculate'),
  dismissReorderRecommendation: (id) => apiClient.patch(`/admin/reorder-recommendations/${id}/dismiss`),
  createPurchaseOrderFromRecommendation: (id, payload) => apiClient.post(`/admin/reorder-recommendations/${id}/purchase-order`, payload),
  getPurchaseOrders: () => apiClient.get('/admin/purchase-orders'),
  createPurchaseOrder: (payload) => apiClient.post('/admin/purchase-orders', payload),
  updatePurchaseOrderStatus: (id, status) => apiClient.patch(`/admin/purchase-orders/${id}/status`, { status }),
  receivePurchaseOrderItems: (id, items) => apiClient.post(`/admin/purchase-orders/${id}/receive`, { items }),
  getSuppliers: () => apiClient.get('/admin/suppliers'),
  createSupplier: (payload) => apiClient.post('/admin/suppliers', payload),
  getAutomationJobRuns: () => apiClient.get('/admin/automation/jobs'),
  triggerAutomationJob: (jobName) => apiClient.post(`/admin/automation/jobs/${jobName}/run`),
  getSystemAlerts: () => apiClient.get('/admin/system-alerts'),

  getGstReport: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/gst', { params });
    return response.data;
  },

  getDeliveryAnalytics: async (params = {}) => {
    const response = await apiClient.get('/admin/analytics/delivery', { params });
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

  addStock: async (productId, quantity, reason = '') => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.ADD_STOCK(productId), { quantity, reason });
    return response.data;
  },

  removeStock: async (productId, quantity, reason = '') => {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REMOVE_STOCK(productId), { quantity, reason });
    return response.data;
  },

  updateThreshold: async (productId, threshold) => {
    const response = await apiClient.patch(ENDPOINTS.ADMIN.STOCK_THRESHOLD(productId), { threshold });
    return response.data;
  },

  getStockMovements: async (productId = null) => {
    const endpoint = productId ? ENDPOINTS.ADMIN.STOCK_MOVEMENTS(productId) : `${ENDPOINTS.ADMIN.INVENTORY}/movements`;
    const response = await apiClient.get(endpoint);
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
