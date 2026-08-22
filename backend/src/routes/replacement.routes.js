const express = require('express');
const router = express.Router();
const replacementController = require('../controllers/replacement.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Customer endpoints
router.post('/orders/:id/replacement-request', replacementController.requestReplacement);
router.get('/replacements/my', replacementController.getMyReplacements);

module.exports = router;
