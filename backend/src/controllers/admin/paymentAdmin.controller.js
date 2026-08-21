const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const paymentAdminService = require('../../services/admin/paymentAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminPayments = asyncHandler(async (req, res) => {
  const result = await paymentAdminService.getAdminPayments(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment logs retrieved', result);
});

module.exports = { getAdminPayments };
