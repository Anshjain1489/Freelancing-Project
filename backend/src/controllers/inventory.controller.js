const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const inventoryService = require('../services/inventory.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getInventoryDetails = asyncHandler(async (req, res) => {
  const inventory = await inventoryService.getInventoryDetails(req.params.productId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory details retrieved', { inventory });
});

const updateInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.updateInventory(req.params.productId, req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory parameters updated', result);
});

const adjustInventory = asyncHandler(async (req, res) => {
  const result = await inventoryService.adjustInventory(req.params.productId, req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Inventory stock adjusted successfully', result);
});

const getLowStockAlerts = asyncHandler(async (req, res) => {
  const alerts = await inventoryService.getLowStockAlerts();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Low stock alerts retrieved', { alerts });
});

module.exports = {
  getInventoryDetails,
  updateInventory,
  adjustInventory,
  getLowStockAlerts
};
