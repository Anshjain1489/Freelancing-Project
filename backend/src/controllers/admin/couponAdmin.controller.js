const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const couponService = require('../../services/coupon.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getAdminCoupons();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin coupons retrieved', { items: result });
});

const createCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.createCoupon(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Coupon created successfully', result);
});

const updateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.updateCoupon(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon updated successfully', result);
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.deleteCoupon(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon deleted successfully', result);
});

module.exports = {
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
