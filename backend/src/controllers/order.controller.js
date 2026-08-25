const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const orderService = require('../services/order.service');
const paymentService = require('../services/payment.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const createOrder = asyncHandler(async (req, res) => {
  const { addressId, couponCode, paymentMethod } = req.body || {};
  const result = await orderService.createOrder(req.user.id, addressId, couponCode, paymentMethod);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Order created successfully', result);
});

const getUserOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getUserOrders(req.user.id, req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Customer orders retrieved successfully', result);
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order details retrieved', { order });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const result = await orderService.cancelOrder(req.user.id, req.params.id, req.body?.reason);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order cancelled successfully', result);
});

const createOrderPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPaymentForOrder(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment checkout initialized', result);
});

const retryOrderPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.createPaymentForOrder(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment checkout generated for retry', result);
});

const orderTrackingService = require('../services/orderTracking.service');
const deliveryOtpService = require('../services/deliveryOtp.service');

const getOrderTracking = asyncHandler(async (req, res) => {
  const result = await orderTrackingService.getCustomerOrderTracking(
    req.user.id,
    req.user.role,
    req.params.id
  );
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order tracking retrieved successfully', result);
});

const getDeliveryOtp = asyncHandler(async (req, res) => {
  const result = await deliveryOtpService.getDeliveryOtpForCustomer(
    req.user.id,
    req.user.role,
    req.params.id
  );
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Delivery OTP retrieved successfully', result);
});

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  createOrderPayment,
  retryOrderPayment,
  getOrderTracking,
  getDeliveryOtp
};
