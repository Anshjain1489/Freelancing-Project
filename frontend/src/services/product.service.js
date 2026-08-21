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

  searchProducts: async (query) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.SEARCH, { params: { q: query } });
    return response.data;
  },

  getProductBySlug: async (slug) => {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS.BY_SLUG(slug));
    return response.data;
  }
};
