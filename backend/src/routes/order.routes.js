const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createOrderSchema, cancelOrderSchema } = require('../validators/order.validator');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', validate(cancelOrderSchema), orderController.cancelOrder);
router.post('/:id/payment/retry', orderController.retryOrderPayment);

module.exports = router;
