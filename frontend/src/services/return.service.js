import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const returnService = {
  async requestReturn(orderId, returnData) {
    const response = await apiClient.post(ENDPOINTS.RETURNS.REQUEST(orderId), returnData);
    return response.data?.data || response.data;
  },

  async getMyReturns() {
    const response = await apiClient.get(ENDPOINTS.RETURNS.MY);
    return response.data?.data || response.data;
  },

  async getAdminReturns(params = {}) {
    const response = await apiClient.get(ENDPOINTS.ADMIN.RETURNS, { params });
    return response.data?.data || response.data;
  },

  async approveReturn(id) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.APPROVE_RETURN(id));
    return response.data?.data || response.data;
  },

  async rejectReturn(id, reason) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.REJECT_RETURN(id), { reason });
    return response.data?.data || response.data;
  },

  async assignPickup(id, deliveryPartnerId) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.ASSIGN_RETURN_PICKUP(id), { deliveryPartnerId });
    return response.data?.data || response.data;
  },

  async confirmReceived(id, itemsCondition = []) {
    const response = await apiClient.post(ENDPOINTS.ADMIN.RECEIVE_RETURN(id), { itemsCondition });
    return response.data?.data || response.data;
  },

  // Reverse Pickup Methods (Delivery Partner)
  async getReturnPickups(params = {}) {
    const response = await apiClient.get(ENDPOINTS.REVERSE_PICKUP.LIST, { params });
    return response.data?.data || response.data;
  },

  async acceptPickup(id) {
    const response = await apiClient.post(ENDPOINTS.REVERSE_PICKUP.ACCEPT(id));
    return response.data?.data || response.data;
  },

  async markPickedUp(id) {
    const response = await apiClient.post(ENDPOINTS.REVERSE_PICKUP.PICKUP(id));
    return response.data?.data || response.data;
  },

  async failPickup(id, reason) {
    const response = await apiClient.post(ENDPOINTS.REVERSE_PICKUP.FAIL(id), { reason });
    return response.data?.data || response.data;
  }
};

export default returnService;
