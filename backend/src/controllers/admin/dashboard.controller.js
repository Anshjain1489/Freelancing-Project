const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const dashboardAdminService = require('../../services/admin/dashboardAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getDashboardSummary = asyncHandler(async (req, res) => {
  const data = await dashboardAdminService.getDashboardSummary(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Dashboard metrics retrieved', data);
});

module.exports = { getDashboardSummary };
