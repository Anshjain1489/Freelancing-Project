const express = require('express');
const router = express.Router();
const aiRiskPricingController = require('../controllers/aiRiskPricing.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/pricing', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRiskPricingController.getPricingRecommendations);
router.post('/pricing/analyze', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiRiskPricingController.analyzePricing);

router.get('/churn', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRiskPricingController.getChurnRisks);
router.post('/churn/evaluate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiRiskPricingController.evaluateChurn);

router.get('/credit', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRiskPricingController.getCreditRisks);
router.post('/credit/assess', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiRiskPricingController.assessCreditRisks);

router.get('/subscriptions', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRiskPricingController.getSubscriptionInsights);
router.post('/subscriptions/evaluate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiRiskPricingController.evaluateSubscriptions);

module.exports = router;
