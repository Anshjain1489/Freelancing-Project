import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

export const paymentService = {
  verifyRazorpayPayment: async ({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const response = await apiClient.post(ENDPOINTS.PAYMENTS.VERIFY_RAZORPAY, {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });
    return response.data;
  },

  reportPaymentFailure: async ({ orderId, razorpayOrderId, failureReason }) => {
    const response = await apiClient.post(ENDPOINTS.PAYMENTS.FAILURE_RAZORPAY, {
      orderId,
      razorpayOrderId,
      failureReason
    });
    return response.data;
  }
};
