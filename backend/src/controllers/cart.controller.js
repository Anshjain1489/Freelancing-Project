const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const cartService = require('../services/cart.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getUserCart(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Cart items retrieved successfully', { cart });
});

const addCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addCartItem(req.user.id, req.body.productId, req.body.quantity);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Item added to cart', { cart });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateCartItemQuantity(req.user.id, req.params.itemId, req.body.quantity);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Cart item updated', { cart });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeCartItem(req.user.id, req.params.itemId);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Item removed from cart', { cart });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Cart cleared', { cart });
});

const syncGuestCart = asyncHandler(async (req, res) => {
  const result = await cartService.syncGuestCart(req.user.id, req.body.items || []);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Guest cart synchronized successfully', result);
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  syncGuestCart
};
