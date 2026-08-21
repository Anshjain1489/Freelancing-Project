const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const checkoutService = require('../services/checkout.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCheckoutPreview = asyncHandler(async (req, res) => {
  const preview = await checkoutService.getCheckoutPreview(req.user.id, req.body.addressId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Checkout preview generated successfully', preview);
});

module.exports = { getCheckoutPreview };
