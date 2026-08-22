const express = require('express');
const router = express.Router();
const replacementController = require('../controllers/replacement.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Customer endpoints
router.post('/orders/:id/replacement-request', authenticate, replacementController.requestReplacement);
router.get('/replacements/my', authenticate, replacementController.getMyReplacements);

module.exports = router;
