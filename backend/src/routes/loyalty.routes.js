const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const loyaltyController = require('../controllers/customer/loyalty.controller');

const router = express.Router();

router.use(authenticate);

// Customer Routes
router.get('/account', loyaltyController.getAccount);
router.get('/ledger', loyaltyController.getLedger);
router.post('/redeem', loyaltyController.redeemPoints);

// Admin Routes
router.get('/admin/accounts', authorizeRoles('ADMIN', 'SUPER_ADMIN'), loyaltyController.listAdminLoyaltyAccounts);
router.post('/admin/adjust', authorizeRoles('ADMIN', 'SUPER_ADMIN'), loyaltyController.adjustAdminPoints);

module.exports = router;
