const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const orderAdminService = require('../../services/admin/orderAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminOrders = asyncHandler(async (req, res) => {
  const result = await orderAdminService.getAdminOrders(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin orders retrieved', result);
});

const getUnresolvedOrders = asyncHandler(async (req, res) => {
  const result = await orderAdminService.getUnresolvedOrders();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Unresolved admin orders retrieved', { items: result });
});

const acceptOrder = asyncHandler(async (req, res) => {
  const result = await orderAdminService.acceptOrder(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order accepted successfully', result);
});

const rejectOrder = asyncHandler(async (req, res) => {
  const result = await orderAdminService.rejectOrder(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order rejected', result);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const result = await orderAdminService.updateOrderStatus(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order status updated', result);
});

module.exports = {
  getAdminOrders,
  getUnresolvedOrders,
  acceptOrder,
  rejectOrder,
  updateOrderStatus
};
