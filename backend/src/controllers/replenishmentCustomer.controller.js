const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const customerReplenishmentService = require('../services/customerReplenishment.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCustomerReplenishments = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const data = await customerReplenishmentService.getCustomerReplenishments(customerId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Customer replenishment recommendations retrieved', data);
});

const generateCustomerReplenishments = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const data = await customerReplenishmentService.generateCustomerReplenishments(customerId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Customer replenishment recommendations generated', data);
});

const dismissCustomerReplenishment = asyncHandler(async (req, res) => {
  const customerId = req.user.id;
  const data = await customerReplenishmentService.dismissCustomerReplenishment(req.params.id, customerId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Replenishment recommendation dismissed', data);
});

module.exports = {
  getCustomerReplenishments,
  generateCustomerReplenishments,
  dismissCustomerReplenishment
};
