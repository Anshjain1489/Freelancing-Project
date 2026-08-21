const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const webhookService = require('../services/webhook.service');
const { HTTP_STATUS } = require('../constants/statusCodes');

const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const result = await webhookService.processRazorpayWebhook(rawBody, signature, req.body);
  return res.status(200).json({ status: 'ok', result });
});

module.exports = { handleRazorpayWebhook };
