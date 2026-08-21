import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const categoryService = {
  getCategories: async () => {
    const response = await apiClient.get(ENDPOINTS.CATEGORIES.LIST);
    return response.data;
  },

  getCategoryBySlug: async (slug) => {
    const response = await apiClient.get(ENDPOINTS.CATEGORIES.BY_SLUG(slug));
    return response.data;
  }
};
