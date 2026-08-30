const express = require('express');
const router = express.Router();
const customerEngagementController = require('../controllers/customerEngagement.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

router.get('/preferences', authenticate, customerEngagementController.getPreferences);
router.patch('/preferences', authenticate, customerEngagementController.updatePreferences);
router.post('/event', optionalAuth, customerEngagementController.logEvent);

module.exports = router;
