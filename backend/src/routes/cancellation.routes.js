const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellation.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Customer endpoints
router.post('/orders/:id/cancellation-request', authenticate, cancellationController.requestCancellation);
router.get('/cancellations/my', authenticate, cancellationController.getMyCancellations);

module.exports = router;
