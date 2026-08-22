const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const orderService = require('../services/order.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const createOrder = asyncHandler(async (req, res) => {
  const { addressId, couponCode } = req.body || {};
  const result = await orderService.createOrder(req.user.id, addressId, couponCode);
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
  const result = await orderService.cancelOrder(req.user.id, req.params.id, req.body.reason);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order cancelled successfully', result);
});

const retryOrderPayment = asyncHandler(async (req, res) => {
  const result = await orderService.retryOrderPayment(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment checkout generated for retry', result);
});

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  retryOrderPayment
};
