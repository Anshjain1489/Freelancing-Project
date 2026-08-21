const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { verifyPaymentSchema } = require('../validators/payment.validator');

const router = express.Router();

router.use(authenticate);

router.post('/razorpay/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);
router.post('/razorpay/failure', paymentController.reportPaymentFailure);

module.exports = router;
