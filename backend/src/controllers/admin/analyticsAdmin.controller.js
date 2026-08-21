const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const analyticsAdminService = require('../../services/admin/analyticsAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getRevenueAnalytics(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Revenue analytics retrieved', data);
});

const getTopProducts = asyncHandler(async (req, res) => {
  const data = await analyticsAdminService.getTopProducts(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Top products analytics retrieved', data);
});

module.exports = {
  getRevenueAnalytics,
  getTopProducts
};
