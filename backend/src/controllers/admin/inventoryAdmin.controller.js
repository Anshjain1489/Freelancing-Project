const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const inventoryAdminService = require('../../services/admin/inventoryAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getInventoryOverview = asyncHandler(async (req, res) => {
  const result = await inventoryAdminService.getInventoryOverview(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory overview retrieved', result);
});

const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryAdminService.adjustStock(req.user.id, req.params.productId, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Stock adjusted successfully', result);
});

module.exports = {
  getInventoryOverview,
  adjustStock
};
