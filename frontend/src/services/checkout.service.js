import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const checkoutService = {
  getPreview: async (addressId, couponCode = null) => {
    const response = await apiClient.post(ENDPOINTS.CHECKOUT.PREVIEW, { addressId, couponCode });
    return response.data;
  }
};
