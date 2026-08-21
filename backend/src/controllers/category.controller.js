const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const categoryService = require('../services/category.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';
  const categories = await categoryService.getCategories(includeInactive);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Categories retrieved successfully', { categories });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Category details retrieved', { category });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Category created successfully', { category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Category updated successfully', { category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.deleteCategory(req.params.id, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Category deactivated successfully', result);
});

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
