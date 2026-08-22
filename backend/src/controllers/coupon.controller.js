const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const couponService = require('../services/coupon.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const validateCoupon = asyncHandler(async (req, res) => {
  const { couponCode, addressId } = req.body;
  const result = await couponService.validateCoupon(req.user.id, couponCode, addressId);
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
