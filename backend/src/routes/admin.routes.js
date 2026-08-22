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
const couponAdminController = require('../controllers/admin/couponAdmin.controller');
const deliveryAdminController = require('../controllers/admin/deliveryAdmin.controller');
const activityAdminController = require('../controllers/admin/activityAdmin.controller');

const cancellationAdminController = require('../controllers/admin/cancellationAdmin.controller');
const returnAdminController = require('../controllers/admin/returnAdmin.controller');
const replacementAdminController = require('../controllers/admin/replacementAdmin.controller');

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
router.post('/inventory/:productId/add', inventoryAdminController.addStock);
router.post('/inventory/:productId/remove', inventoryAdminController.removeStock);
router.patch('/inventory/:productId/threshold', inventoryAdminController.updateThreshold);
router.get('/inventory/:productId/movements', inventoryAdminController.getStockMovements);
router.get('/inventory/movements', inventoryAdminController.getStockMovements);
router.post('/inventory/:productId/adjust', inventoryAdminController.adjustStock);

// Order Management
router.get('/orders', orderAdminController.getAdminOrders);
router.get('/orders/unresolved', orderAdminController.getUnresolvedOrders);
router.post('/orders/:id/accept', orderAdminController.acceptOrder);
router.post('/orders/:id/reject', orderAdminController.rejectOrder);
router.post('/orders/:id/refund/retry', orderAdminController.retryRefund);
router.patch('/orders/:id/status', orderAdminController.updateOrderStatus);

// Cancellation Management
router.get('/cancellations', cancellationAdminController.getCancellations);
router.post('/cancellations/:id/approve', cancellationAdminController.approveCancellation);
router.post('/cancellations/:id/reject', cancellationAdminController.rejectCancellation);

// Return Management
router.get('/returns', returnAdminController.getReturns);
router.post('/returns/:id/approve', returnAdminController.approveReturn);
router.post('/returns/:id/reject', returnAdminController.rejectReturn);
router.post('/returns/:id/assign-pickup', returnAdminController.assignPickup);
router.post('/returns/:id/receive', returnAdminController.confirmReceived);

// Replacement Management
router.get('/replacements', replacementAdminController.getReplacements);
router.post('/replacements/:id/approve', replacementAdminController.approveReplacement);
router.post('/replacements/:id/reject', replacementAdminController.rejectReplacement);
router.patch('/replacements/:id/fulfillment', replacementAdminController.updateFulfillment);

// Delivery Management
router.get('/delivery/dashboard', deliveryAdminController.getAdminDeliveryDashboard);
router.get('/delivery-partners', deliveryAdminController.getDeliveryPartners);
router.post('/delivery-partners', deliveryAdminController.createDeliveryPartner);
router.get('/delivery/orders/unassigned', deliveryAdminController.getUnassignedOrders);
router.get('/delivery/orders/assigned', deliveryAdminController.getAssignedDeliveries);
router.post('/orders/:orderId/assign-delivery', deliveryAdminController.assignDeliveryPartner);
router.post('/orders/:orderId/reassign-delivery', deliveryAdminController.reassignDeliveryPartner);

// Coupon Management
router.get('/coupons', couponAdminController.getAdminCoupons);
router.post('/coupons', couponAdminController.createCoupon);
router.patch('/coupons/:id', couponAdminController.updateCoupon);
router.delete('/coupons/:id', couponAdminController.deleteCoupon);

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
