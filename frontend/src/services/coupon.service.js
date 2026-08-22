import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const couponService = {
  validateCoupon: async (couponCode, addressId = null) => {
    const response = await apiClient.post(ENDPOINTS.COUPONS.VALIDATE, { couponCode, addressId });
    return response.data;
  },

  getAvailableCoupons: async () => {
    const response = await apiClient.get(ENDPOINTS.COUPONS.AVAILABLE);
    return response.data;
  }
};
