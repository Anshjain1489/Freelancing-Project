const express = require('express');
const { authenticate, authorizeAdmin } = require('../middleware/auth.middleware');

const dashboardController = require('../controllers/admin/dashboard.controller');
const analyticsAdminController = require('../controllers/admin/analyticsAdmin.controller');
const productAdminController = require('../controllers/admin/productAdmin.controller');
const inventoryAdminController = require('../controllers/admin/inventoryAdmin.controller');
const orderAdminController = require('../controllers/admin/orderAdmin.controller');
const customerAdminController = require('../controllers/admin/customerAdmin.controller');
const paymentAdminController = require('../controllers/admin/paymentAdmin.controller');
const promotionAdminController = require('../controllers/admin/promotionAdmin.controller');
const activityAdminController = require('../controllers/admin/activityAdmin.controller');

const router = express.Router();

// Strict Admin RBAC Protection Middleware
router.use(authenticate);
router.use(authorizeAdmin);

// Dashboard Overview
router.get('/dashboard', dashboardController.getDashboardSummary);

// Business Analytics
router.get('/analytics/revenue', analyticsAdminController.getRevenueAnalytics);
router.get('/analytics/top-products', analyticsAdminController.getTopProducts);

// Product Management
router.get('/products', productAdminController.getAdminProducts);
router.post('/products', productAdminController.createProduct);
router.patch('/products/:id', productAdminController.updateProduct);

// Inventory Management
router.get('/inventory', inventoryAdminController.getInventoryOverview);
router.post('/inventory/:productId/adjust', inventoryAdminController.adjustStock);

// Order Management
router.get('/orders', orderAdminController.getAdminOrders);
router.get('/orders/unresolved', orderAdminController.getUnresolvedOrders);
router.post('/orders/:id/accept', orderAdminController.acceptOrder);
router.post('/orders/:id/reject', orderAdminController.rejectOrder);
router.patch('/orders/:id/status', orderAdminController.updateOrderStatus);

// Customer Management
router.get('/customers', customerAdminController.getAdminCustomers);

// Payment Management
router.get('/payments', paymentAdminController.getAdminPayments);

// Promotions & Banners
router.get('/promotions', promotionAdminController.getPromotions);
router.post('/promotions', promotionAdminController.createPromotion);
router.get('/banners', promotionAdminController.getBanners);
router.post('/banners', promotionAdminController.createBanner);

// Activity Audit Log
router.get('/activity', activityAdminController.getAdminActivityLogs);

module.exports = router;
