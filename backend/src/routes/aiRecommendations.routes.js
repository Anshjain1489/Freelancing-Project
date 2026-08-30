const express = require('express');
const router = express.Router();
const aiRecommendationsController = require('../controllers/aiRecommendations.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/products', aiRecommendationsController.getCustomerRecommendations);
router.get('/campaigns', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRecommendationsController.getCampaignProposals);
router.post('/campaigns/generate', authorizeRole(['ADMIN', 'SUPER_ADMIN']), aiRecommendationsController.generateCampaignProposals);

router.get('/queue', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRecommendationsController.getPendingRecommendationsQueue);
router.post('/queue/:id/approve', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRecommendationsController.approveRecommendation);
router.post('/queue/:id/reject', authorizeRole(['ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER']), aiRecommendationsController.rejectRecommendation);

module.exports = router;
