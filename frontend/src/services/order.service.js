import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const orderService = {
  createOrder: async (addressId, couponCode = null, paymentMethod = 'RAZORPAY') => {
    const response = await apiClient.post(ENDPOINTS.ORDERS.CREATE, { addressId, couponCode, paymentMethod });
    return response.data;
  },

  getUserOrders: async (params = {}) => {
    const response = await apiClient.get(ENDPOINTS.ORDERS.LIST, { params });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await apiClient.get(ENDPOINTS.ORDERS.BY_ID(id));
    return response.data;
  },

  cancelOrder: async (id, reason = '') => {
    const response = await apiClient.post(ENDPOINTS.ORDERS.CANCEL(id), { reason });
    return response.data;
  },

  createPayment: async (id) => {
    const response = await apiClient.post(ENDPOINTS.ORDERS.CREATE_PAYMENT(id));
    return response.data;
  },

  retryPayment: async (id) => {
    const response = await apiClient.post(ENDPOINTS.ORDERS.RETRY_PAYMENT(id));
    return response.data;
  },

  getOrderTracking: async (id) => {
    const response = await apiClient.get(ENDPOINTS.ORDERS.ORDER_TRACKING(id));
    return response.data;
  },

  getDeliveryOtp: async (id) => {
    const response = await apiClient.get(ENDPOINTS.ORDERS.DELIVERY_OTP(id));
    return response.data;
  }
};
