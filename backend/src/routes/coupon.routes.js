const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const couponController = require('../controllers/coupon.controller');

const router = express.Router();

router.use(authenticate);

router.post('/validate', couponController.validateCoupon);
router.post('/apply', couponController.validateCoupon);
router.get('/available', couponController.getAvailableCoupons);

module.exports = router;
