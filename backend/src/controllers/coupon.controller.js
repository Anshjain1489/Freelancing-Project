const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const couponService = require('../services/coupon.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const validateCoupon = asyncHandler(async (req, res) => {
  const code = req.body.couponCode || req.body.code;
  const addressIdOrCartTotal = req.body.cartTotal || req.body.cartSubtotal || req.body.addressId || null;
  const result = await couponService.validateCoupon(req.user.id, code, addressIdOrCartTotal);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message, result);
});

const getAvailableCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getAvailableCoupons(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Available coupons retrieved', result);
});

module.exports = {
  validateCoupon,
  getAvailableCoupons
};
