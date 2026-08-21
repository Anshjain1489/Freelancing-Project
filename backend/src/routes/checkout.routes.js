const express = require('express');
const checkoutController = require('../controllers/checkout.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { checkoutPreviewSchema } = require('../validators/checkout.validator');

const router = express.Router();

router.use(authenticate);

router.post('/preview', validate(checkoutPreviewSchema), checkoutController.getCheckoutPreview);

module.exports = router;
