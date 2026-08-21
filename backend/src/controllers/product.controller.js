const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const productService = require('../services/product.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Products retrieved successfully', result);
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await productService.getFeaturedProducts();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Featured products retrieved', { products });
});

const searchProducts = asyncHandler(async (req, res) => {
  const products = await productService.searchProducts(req.query.q);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product search results', { products });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product details retrieved', { product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Product created successfully', { product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product updated successfully', { product });
});

const toggleProductStatus = asyncHandler(async (req, res) => {
  const result = await productService.toggleProductStatus(req.params.id, req.body.isActive, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product status updated', result);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.toggleProductStatus(req.params.id, false, req.user.id, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product deactivated successfully', result);
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  searchProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct
};
