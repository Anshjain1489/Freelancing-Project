const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth.middleware');
const storeCreditController = require('../controllers/customer/storeCredit.controller');

const router = express.Router();

router.use(authenticate);

// Customer Routes
router.get('/account', storeCreditController.getAccount);
router.get('/statement', storeCreditController.getStatement);
router.post('/repayment', storeCreditController.recordRepayment);

// Admin / Super Admin Routes
router.get('/admin/accounts', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeCreditController.listAdminCreditAccounts);
router.patch('/admin/accounts/:id/limit', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeCreditController.updateAdminCreditLimit);
router.post('/admin/accounts/:id/suspend', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeCreditController.suspendAdminCredit);
router.post('/admin/accounts/:id/repayment', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeCreditController.recordAdminRepayment);
router.get('/admin/accounts/:id/reminder', authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeCreditController.getReminderPayload);

module.exports = router;
