import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const replacementService = {
  async requestReplacement(orderId, replacementData) {
    const response = await apiClient.post(ENDPOINTS.REPLACEMENTS.REQUEST(orderId), replacementData);
    return response.data?.data || response.data;
  },

  async getMyReplacements() {
    const response = await apiClient.get(ENDPOINTS.REPLACEMENTS.MY);
    return response.data?.data || response.data;
  },

  async getAdminReplacements(params = {}) {
    const response = await apiClient.get(ENDPOINTS.ADMIN.REPLACEMENTS, { params });
    return response.data?.data || response.data;
  },

  async approveReplacement(id) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_REPLACEMENT(id));
    return response.data?.data || response.data;
  },

  async rejectReplacement(id, reason) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REJECT_REPLACEMENT(id), { reason });
    return response.data?.data || response.data;
  },

  async updateFulfillment(id, status) {
    const response = await apiClient.patch(ENDPOINTS.ADMIN.UPDATE_REPLACEMENT_FULFILLMENT(id), { status });
    return response.data?.data || response.data;
  }
};

export default replacementService;
