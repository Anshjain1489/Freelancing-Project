const express = require('express');
const router = express.Router();
const marketingCampaignController = require('../controllers/marketingCampaign.controller');
const abandonedCartController = require('../controllers/abandonedCart.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

// Marketing Campaign Admin Endpoints
router.post('/campaigns', authenticate, authorizeAdmin, marketingCampaignController.createCampaignAdmin);
router.patch('/campaigns/:id', authenticate, authorizeAdmin, marketingCampaignController.updateCampaignAdmin);
router.get('/campaigns', authenticate, authorizeAdmin, marketingCampaignController.listCampaignsAdmin);
router.get('/campaigns/:id/analytics', authenticate, authorizeAdmin, marketingCampaignController.getCampaignAnalyticsAdmin);
router.post('/campaigns/:id/dispatch', authenticate, authorizeAdmin, marketingCampaignController.dispatchCampaignAdmin);

// Abandoned Cart Admin Endpoints
router.get('/abandoned-carts', authenticate, authorizeAdmin, abandonedCartController.listAbandonedCartsAdmin);
router.post('/abandoned-carts/reminders', authenticate, authorizeAdmin, abandonedCartController.triggerRecoveryRemindersAdmin);

module.exports = router;
