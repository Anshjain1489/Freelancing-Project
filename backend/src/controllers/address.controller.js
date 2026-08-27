const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const addressService = require('../services/address.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getAddresses(req.user.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Addresses retrieved', { addresses });
});

const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user.id, req.body);
  return ApiResponse.success(res, HTTP_STATUS.CREATED, 'Address created successfully', { address });
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Address updated successfully', { address });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteAddress(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Address deleted', result);
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.user.id, req.params.id);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Default address set successfully', { address });
});

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
