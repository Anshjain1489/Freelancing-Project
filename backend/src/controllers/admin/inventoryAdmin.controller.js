const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const inventoryAdminService = require('../../services/admin/inventoryAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getInventoryOverview = asyncHandler(async (req, res) => {
  const result = await inventoryAdminService.getInventoryOverview(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory overview retrieved', result);
});

const addStock = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const result = await inventoryAdminService.addStock(req.user.id, req.params.productId, quantity, reason, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Stock added successfully', result);
});

const removeStock = asyncHandler(async (req, res) => {
  const { quantity, reason } = req.body;
  const result = await inventoryAdminService.removeStock(req.user.id, req.params.productId, quantity, reason, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Stock removed successfully', result);
});

const updateThreshold = asyncHandler(async (req, res) => {
  const { threshold } = req.body;
  const result = await inventoryAdminService.updateThreshold(req.user.id, req.params.productId, threshold, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Low stock threshold updated', result);
});

const getStockMovements = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.query.productId;
  const result = await inventoryAdminService.getStockMovements(productId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Stock movements retrieved', { movements: result });
});

const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryAdminService.adjustStock(req.user.id, req.params.productId, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Stock adjusted successfully', result);
});

module.exports = {
  getInventoryOverview,
  addStock,
  removeStock,
  updateThreshold,
  getStockMovements,
  adjustStock
};
