const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const deliveryAdminController = require('../controllers/admin/deliveryAdmin.controller');
const { authenticate, authorizeAdmin, optionalAuth } = require('../middleware/auth.middleware');
const { generalLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/calculate', generalLimiter, optionalAuth, deliveryController.calculateDeliveryFee);

// Phase 42 Delivery Agent WhatsApp Click-to-Chat Dispatch Endpoint
router.get('/whatsapp-link/:orderId', authenticate, authorizeAdmin, deliveryAdminController.getWhatsAppClickToChatLink);

// Phase 42 Combined Assign & WhatsApp Endpoint
router.post('/assign-and-whatsapp/:orderId', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { deliveryPartnerId, delivery_agent_id } = req.body || {};
    const partnerId = deliveryPartnerId || delivery_agent_id;
    const assignRes = await require('../services/delivery.management.service').assignDeliveryPartner(
      req.user.id,
      req.params.orderId,
      partnerId,
      30,
      req
    );
    return res.status(200).json(assignRes);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
