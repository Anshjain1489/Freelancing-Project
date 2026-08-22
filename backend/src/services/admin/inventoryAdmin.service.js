const inventoryService = require('../inventory.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getInventoryOverview = async (queryParams = {}) => {
  return inventoryService.getInventoryOverview(queryParams);
};

const addStock = async (adminId, productId, quantity, reason, req = null) => {
  return inventoryService.addStock(adminId, productId, quantity, reason, req);
};

const removeStock = async (adminId, productId, quantity, reason, req = null) => {
  return inventoryService.removeStock(adminId, productId, quantity, reason, req);
};

const updateThreshold = async (adminId, productId, threshold, req = null) => {
  return inventoryService.updateThreshold(adminId, productId, threshold, req);
};

const getStockMovements = async (productId) => {
  return inventoryService.getStockMovements(productId);
};

const adjustStock = async (adminId, productId, { quantityChange, reason = 'MANUAL_ADJUSTMENT' }, req = null) => {
  const qty = parseInt(quantityChange, 10);
  if (isNaN(qty) || qty === 0) {
    throw new AppError('Valid non-zero quantity change is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (qty > 0) {
    return inventoryService.addStock(adminId, productId, qty, reason, req);
  } else {
    return inventoryService.removeStock(adminId, productId, Math.abs(qty), reason, req);
  }
};

module.exports = {
  getInventoryOverview,
  addStock,
  removeStock,
  updateThreshold,
  getStockMovements,
  adjustStock
};
