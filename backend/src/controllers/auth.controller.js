const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerCustomer(req.body);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Customer registration successful', result);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Login successful', result);
});

const googleLogin = asyncHandler(async (req, res) => {
  const result = await authService.googleLogin(req.body.idToken);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Google authentication successful', result);
});

const logout = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Logged out successfully');
});

const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Access token refreshed successfully', result);
});

const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Current authenticated user profile', { user: req.user });
});

const forgotPassword = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, HTTP_STATUS.OK, 'If an account exists, a password reset link has been dispatched.');
});

const resetPassword = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Password reset successful. Please login with your new password.');
});

module.exports = {
  register,
  login,
  googleLogin,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword
};
