import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const productService = {
  getProducts: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.LIST, { params });
    return response.data;
  },

  getFeaturedProducts: async () => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.FEATURED);
    return response.data;
  },

  searchProducts: async (query, options = {}) => {
    const { limit = 8, signal } = options;
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.SEARCH, {
      params: { q: query, limit },
      signal
    });
    return response.data;
  },

  getProductBySlug: async (slug) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.BY_SLUG(slug));
    return response.data;
  },

  subscribeStockNotification: async (productId) => {
    const response = await apiClient.post(`/products/${productId}/notify`);
    return response.data;
  }
};
