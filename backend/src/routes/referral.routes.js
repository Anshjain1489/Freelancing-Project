const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

// Customer Referral Endpoints
router.get('/', authenticate, referralController.getReferralSummary);
router.get('/code', authenticate, referralController.getReferralCode);
router.post('/generate', authenticate, referralController.generateReferralCode);
router.post('/apply', authenticate, referralController.applyReferralCode);

// Admin Endpoints
router.get('/admin', authenticate, authorizeAdmin, referralController.listReferralsAdmin);
router.get('/admin/analytics', authenticate, authorizeAdmin, referralController.listReferralsAdmin);

module.exports = router;
