const express = require('express');
const router = express.Router();
const customerCRMController = require('../controllers/customerCRM.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

// Customer Endpoints
router.get('/profile', authenticate, customerCRMController.getCustomerProfile);
router.get('/insights', authenticate, customerCRMController.getCustomerInsights);

// Admin Endpoints
router.get('/customers', authenticate, authorizeAdmin, customerCRMController.listCustomersAdmin);
router.get('/customers/:id', authenticate, authorizeAdmin, customerCRMController.getCustomerDetailAdmin);
router.get('/segments', authenticate, authorizeAdmin, customerCRMController.listSegmentsAdmin);
router.post('/segments', authenticate, authorizeAdmin, customerCRMController.createSegmentAdmin);

module.exports = router;
