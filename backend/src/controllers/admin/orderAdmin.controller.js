const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const orderAdminService = require('../../services/admin/orderAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminOrders = asyncHandler(async (req, res) => {
  const result = await orderAdminService.getAdminOrders(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin orders retrieved', result);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const result = await orderAdminService.updateOrderStatus(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Order status updated', result);
});

module.exports = {
  getAdminOrders,
  updateOrderStatus
};
