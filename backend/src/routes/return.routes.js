const express = require('express');
const router = express.Router();
const returnController = require('../controllers/return.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Customer endpoints
router.post('/orders/:id/return-request', authenticate, returnController.requestReturn);
router.get('/returns/my', authenticate, returnController.getMyReturns);

module.exports = router;
