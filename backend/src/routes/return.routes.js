const express = require('express');
const router = express.Router();
const returnController = require('../controllers/return.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Customer endpoints
router.post('/orders/:id/return-request', returnController.requestReturn);
router.get('/returns/my', returnController.getMyReturns);

module.exports = router;
