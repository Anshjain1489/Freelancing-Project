const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const promotionAdminService = require('../../services/admin/promotionAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getPromotions = asyncHandler(async (req, res) => {
  const result = await promotionAdminService.getPromotions();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Promotions retrieved', result);
});

const createPromotion = asyncHandler(async (req, res) => {
  const result = await promotionAdminService.createPromotion(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Promotion created', { promotion: result });
});

const getBanners = asyncHandler(async (req, res) => {
  const result = await promotionAdminService.getBanners();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Banners retrieved', result);
});

const createBanner = asyncHandler(async (req, res) => {
  const result = await promotionAdminService.createBanner(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Banner created', { banner: result });
});

module.exports = {
  getPromotions,
  createPromotion,
  getBanners,
  createBanner
};
