const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const deliveryService = require('../services/delivery.management.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getPartnerDashboard = asyncHandler(async (req, res) => {
  const stats = await deliveryService.getPartnerDashboard(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Delivery Partner dashboard stats retrieved', stats);
});

const getPartnerOrders = asyncHandler(async (req, res) => {
  const orders = await deliveryService.getPartnerOrders(req.user.id, req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Assigned delivery orders retrieved', { items: orders });
});

const getPartnerOrderById = asyncHandler(async (req, res) => {
  const order = await deliveryService.getPartnerOrderById(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Delivery order details retrieved', { order });
});

const acceptDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.acceptDelivery(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const pickupDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.pickupDelivery(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const startDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.pickupDelivery(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const deliverOrder = asyncHandler(async (req, res) => {
  const result = await deliveryService.deliverOrder(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const failDelivery = asyncHandler(async (req, res) => {
  const result = await deliveryService.failDelivery(req.user.id, req.params.id, req.body.reason || req.body.failureReason);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

module.exports = {
  getPartnerDashboard,
  getPartnerOrders,
  getPartnerOrderById,
  acceptDelivery,
  pickupDelivery,
  startDelivery,
  deliverOrder,
  failDelivery
};
