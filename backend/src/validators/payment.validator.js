const { z } = require('zod');

const verifyPaymentSchema = {
  body: z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
    razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
    razorpaySignature: z.string().min(1, 'Razorpay signature is required')
  })
};

module.exports = { verifyPaymentSchema };
