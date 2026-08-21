const express = require('express');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { addCartItemSchema, updateCartItemSchema, syncCartSchema } = require('../validators/cart.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addCartItem);
router.patch('/items/:itemId', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);
router.post('/sync', validate(syncCartSchema), cartController.syncGuestCart);

module.exports = router;
