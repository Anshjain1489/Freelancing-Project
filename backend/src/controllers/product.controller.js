const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const productService = require('../services/product.service');
const cacheService = require('../services/cache.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getProducts = asyncHandler(async (req, res) => {
  const queryStr = JSON.stringify(req.query || {});
  const cacheKey = `products:list:${queryStr}`;
  const cached = cacheService.get(cacheKey);

  if (cached) {
    return ApiResponse.success(res, HTTP_STATUS.OK, 'Products retrieved successfully (cached)', cached);
  }

  const result = await productService.getProducts(req.query);
  cacheService.set(cacheKey, result, 120000); // 2 Min TTL
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Products retrieved successfully', result);
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const cacheKey = 'products:featured';
  const cached = cacheService.get(cacheKey);

  if (cached) {
    return ApiResponse.success(res, HTTP_STATUS.OK, 'Featured products retrieved (cached)', { products: cached });
  }

  const products = await productService.getFeaturedProducts();
  cacheService.set(cacheKey, products, 300000); // 5 Min TTL
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Featured products retrieved', { products });
});

const searchProducts = asyncHandler(async (req, res) => {
  const queryTerm = String(req.query.q || '').trim().toLowerCase();
  const cacheKey = `products:search:${queryTerm}`;
  const cached = cacheService.get(cacheKey);

  if (cached) {
    return ApiResponse.success(res, HTTP_STATUS.OK, 'Product search results (cached)', { products: cached });
  }

  const products = await productService.searchProducts(req.query.q);
  cacheService.set(cacheKey, products, 120000);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product search results', { products });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const cacheKey = `products:slug:${slug}`;
  const cached = cacheService.get(cacheKey);

  if (cached) {
    return ApiResponse.success(res, HTTP_STATUS.OK, 'Product details retrieved (cached)', { product: cached });
  }

  const product = await productService.getProductBySlug(req.params.slug);
  cacheService.set(cacheKey, product, 300000);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product details retrieved', { product });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user.id, req);
  cacheService.invalidateProductCache();
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Product created successfully', { product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user.id, req);
  cacheService.invalidateProductCache();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product updated successfully', { product });
});

const toggleProductStatus = asyncHandler(async (req, res) => {
  const result = await productService.toggleProductStatus(req.params.id, req.body.isActive, req.user.id, req);
  cacheService.invalidateProductCache();
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Product status updated', result);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.toggleProductStatus(req.params.id, false, req.user.id, req);
  cacheService.invalidateProductCache();
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
