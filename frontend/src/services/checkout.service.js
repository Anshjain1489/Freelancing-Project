import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const checkoutService = {
  getPreview: async (addressId) => {
    const response = await apiClient.post(ENDPOINTS.CHECKOUT.PREVIEW, { addressId });
    return response.data;
  }
};
