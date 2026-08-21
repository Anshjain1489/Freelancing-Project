const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const productAdminService = require('../../services/admin/productAdmin.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminProducts = asyncHandler(async (req, res) => {
  const result = await productAdminService.getAdminProducts(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Admin products retrieved', result);
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productAdminService.createProduct(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Product created successfully', { product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productAdminService.updateProduct(req.user.id, req.params.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product updated successfully', { product });
});

module.exports = {
  getAdminProducts,
  createProduct,
  updateProduct
};
