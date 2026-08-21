const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const paymentService = require('../services/payment.service');
const razorpayService = require('../services/razorpay.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(req.user.id, req.body, req);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment verified successfully', result);
});

const reportPaymentFailure = asyncHandler(async (req, res) => {
  const result = await paymentService.handlePaymentFailure(req.user.id, req.body);
  return ApiResponse.success(res, HTTP_STATUS.OK, 'Payment failure recorded', result);
});

module.exports = {
  verifyPayment,
  reportPaymentFailure
};
