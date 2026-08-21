const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const activityAdminService = require('../../services/admin/activityAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminActivityLogs = asyncHandler(async (req, res) => {
  const result = await activityAdminService.getAdminActivityLogs(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin activity logs retrieved', result);
});

module.exports = { getAdminActivityLogs };
