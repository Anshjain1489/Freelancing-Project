const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { updateInventorySchema, adjustInventorySchema } = require('../validators/inventory.validator');

const router = express.Router();

// Admin Only Inventory Management Routes
router.use(authenticate, authorizeAdmin);

router.get('/alerts/low-stock', inventoryController.getLowStockAlerts);
router.get('/:productId', inventoryController.getInventoryDetails);
router.patch('/:productId', validate(updateInventorySchema), inventoryController.updateInventory);
router.post('/:productId/adjust', validate(adjustInventorySchema), inventoryController.adjustInventory);

module.exports = router;
