const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const userService = require('../services/user.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getUserProfile(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'User profile retrieved', { user: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const updated = await userService.updateUserProfile(req.user.id, req.body);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Profile updated successfully', { user: updated });
});

module.exports = {
  getProfile,
  updateProfile
};
