const express = require('express');
const { authenticate, optionalAuth, authorizeRoles } = require('../middleware/auth.middleware');
const storeBranchController = require('../controllers/admin/storeBranch.controller');

const router = express.Router();

// Public / Active Branches Endpoint
router.get('/', optionalAuth, storeBranchController.listBranches);
router.get('/:id', optionalAuth, storeBranchController.getBranch);

// Admin Routes
router.post('/admin', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeBranchController.createBranch);
router.patch('/admin/:id', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeBranchController.updateBranch);
router.post('/admin/:id/activate', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeBranchController.activateBranch);
router.post('/admin/:id/deactivate', authenticate, authorizeRoles('ADMIN', 'SUPER_ADMIN'), storeBranchController.deactivateBranch);

module.exports = router;
