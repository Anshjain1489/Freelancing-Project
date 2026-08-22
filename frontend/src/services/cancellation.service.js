import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const cancellationService = {
  async requestCancellation(orderId, reason) {
    const response = await apiClient.post(ENDPOINTS.CANCELLATIONS.REQUEST(orderId), { reason });
    return response.data?.data || response.data;
  },

  async getMyCancellations() {
    const response = await apiClient.get(ENDPOINTS.CANCELLATIONS.MY);
    return response.data?.data || response.data;
  },

  async getAdminCancellations(params = {}) {
    const response = await apiClient.get(ENDPOINTS.ADMIN.CANCELLATIONS, { params });
    return response.data?.data || response.data;
  },

  async approveCancellation(id) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_CANCELLATION(id));
    return response.data?.data || response.data;
  },

  async rejectCancellation(id, reason) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REJECT_CANCELLATION(id), { reason });
    return response.data?.data || response.data;
  }
};

export default cancellationService;
