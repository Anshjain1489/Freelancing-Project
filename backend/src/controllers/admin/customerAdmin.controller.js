const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const customerAdminService = require('../../services/admin/customerAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminCustomers = asyncHandler(async (req, res) => {
  const result = await customerAdminService.getAdminCustomers(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Customer directory retrieved', result);
});

module.exports = { getAdminCustomers };
