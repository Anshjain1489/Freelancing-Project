const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const couponService = require('../../services/coupon.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const AppError = require('../../utils/AppError');

const getAdminCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getAdminCoupons();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin coupons retrieved', { items: result });
});

const getCouponById = asyncHandler(async (req, res) => {
  const result = await couponService.getCouponById(req.params.id);
  if (!result) throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon details retrieved', result);
});

const createCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.createCoupon(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Coupon created successfully', result);
});

const updateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.updateCoupon(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon updated successfully', result);
});

const activateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.activateCoupon(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon activated successfully', result);
});

const deactivateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.deactivateCoupon(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon deactivated successfully', result);
});

const toggleCouponStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const result = isActive !== false
    ? await couponService.activateCoupon(req.user.id, req.params.id, req)
    : await couponService.deactivateCoupon(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Coupon status updated successfully', result);
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.deleteCoupon(req.user.id, req.params.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, result.message || 'Coupon deleted successfully', result);
});

module.exports = {
  getAdminCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  activateCoupon,
  deactivateCoupon,
  toggleCouponStatus,
  deleteCoupon
};
