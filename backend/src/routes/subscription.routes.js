const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const subscriptionController = require('../controllers/customer/subscription.controller');

const router = express.Router();

router.use(authenticate);

// Customer Routes
router.get('/', subscriptionController.listSubscriptions);
router.post('/', subscriptionController.createSubscription);
router.get('/:id', subscriptionController.getSubscription);
router.patch('/:id', subscriptionController.updateSubscription);
router.post('/:id/pause', subscriptionController.pauseSubscription);
router.post('/:id/resume', subscriptionController.resumeSubscription);
router.post('/:id/skip', subscriptionController.skipNextDelivery);
router.post('/:id/cancel', subscriptionController.cancelSubscription);

// Admin Routes
router.get('/admin/list', authorizeRoles('ADMIN', 'SUPER_ADMIN'), subscriptionController.listAdminSubscriptions);
router.post('/admin/dispatch', authorizeRoles('ADMIN', 'SUPER_ADMIN'), subscriptionController.dispatchAdminSubscriptions);

module.exports = router;
