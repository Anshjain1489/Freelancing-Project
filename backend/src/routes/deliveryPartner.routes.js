const express = require('express');
const { authenticate, authorizeDeliveryPartner } = require('../middleware/auth.middleware');
const deliveryController = require('../controllers/deliveryPartner.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorizeDeliveryPartner);

router.get('/dashboard', deliveryController.getPartnerDashboard);
router.get('/orders', deliveryController.getPartnerOrders);
router.get('/orders/:id', deliveryController.getPartnerOrderById);
router.post('/orders/:id/accept', deliveryController.acceptDelivery);
router.post('/orders/:id/pickup', deliveryController.pickupDelivery);
router.post('/orders/:id/start', deliveryController.startDelivery);
router.post('/orders/:id/deliver', deliveryController.deliverOrder);
router.post('/orders/:id/failed', deliveryController.failDelivery);

module.exports = router;
