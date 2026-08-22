const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const checkoutService = require('../services/checkout.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCheckoutPreview = asyncHandler(async (req, res) => {
  const addressId = req.body.addressId || req.query.addressId;
  const couponCode = req.body.couponCode || req.query.couponCode;
  const preview = await checkoutService.getCheckoutPreview(req.user.id, addressId, couponCode);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Checkout preview generated successfully', preview);
});

module.exports = { getCheckoutPreview };
