const express = require('express');
const router = express.Router();
const cancellationController = require('../controllers/cancellation.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Customer endpoints
router.post('/orders/:id/cancellation-request', cancellationController.requestCancellation);
router.get('/cancellations/my', cancellationController.getMyCancellations);

module.exports = router;
