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
const observabilityController = require('../controllers/observability.controller');

const storeConfigRoutes = require('./admin/storeConfig.routes');
const systemHealthRoutes = require('./admin/systemHealth.routes');

const router = express.Router();

// Strict Admin RBAC Protection Middleware
router.use(authenticate);
router.use(authorizeAdmin);

// Phase 42 Store White-Labeling & System Health
router.use('/store-config', storeConfigRoutes);
router.use('/system-health', systemHealthRoutes);

// Dashboard Overview
router.get('/dashboard', dashboardController.getDashboardSummary);
router.get('/observability/dashboard', observabilityController.getObservabilityDashboard);

// Business Analytics & Intelligence
router.get('/analytics/overview', analyticsAdminController.getDashboardOverview);
router.get('/analytics/sales', analyticsAdminController.getSalesAnalytics);
router.get('/analytics/revenue', analyticsAdminController.getRevenueAnalytics);
router.get('/analytics/products', analyticsAdminController.getProductAnalytics);
router.get('/analytics/top-products', analyticsAdminController.getTopProducts);
router.get('/analytics/inventory', analyticsAdminController.getInventoryAnalytics);
router.get('/analytics/payments', analyticsAdminController.getSalesAnalytics);
router.get('/analytics/gst', analyticsAdminController.getGstReport);
router.get('/analytics/delivery', analyticsAdminController.getDeliveryAnalytics);
router.get('/analytics/export/:type', analyticsAdminController.exportCsv);
router.get('/analytics/report/pdf', analyticsAdminController.exportPdfMonthlyReport);

// Phase 39 Operations & Reorder Intelligence
const operationsAdminController = require('../controllers/admin/operationsAdmin.controller');
router.get('/operations/overview', operationsAdminController.getOperationsOverview);
router.get('/reorder-recommendations', operationsAdminController.getReorderRecommendations);
router.post('/reorder-recommendations/calculate', operationsAdminController.triggerReorderRecommendations);
router.patch('/reorder-recommendations/:id/dismiss', operationsAdminController.dismissReorderRecommendation);
router.post('/reorder-recommendations/:id/purchase-order', operationsAdminController.createPurchaseOrderFromRecommendation);
router.get('/purchase-orders', operationsAdminController.getPurchaseOrders);
router.post('/purchase-orders', operationsAdminController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', operationsAdminController.updatePurchaseOrderStatus);
router.post('/purchase-orders/:id/receive', operationsAdminController.receivePurchaseOrderItems);
router.get('/suppliers', operationsAdminController.getSuppliers);
router.post('/suppliers', operationsAdminController.createSupplier);
router.get('/automation/jobs', operationsAdminController.getAutomationJobRuns);
router.post('/automation/jobs/:jobName/run', operationsAdminController.triggerAutomationJob);
router.get('/system-alerts', operationsAdminController.getSystemAlerts);

// Phase 40 Procurement, Valuation & Advanced Inventory Management
const procurementAdminController = require('../controllers/admin/procurementAdmin.controller');
router.get('/procurement/suppliers', procurementAdminController.getSuppliers);
router.put('/procurement/purchase-orders/:id', procurementAdminController.editDraftPO);
router.patch('/procurement/purchase-orders/:id/status', procurementAdminController.updatePOStatus);
router.post('/procurement/purchase-orders/:id/receive', procurementAdminController.receivePOItems);
router.post('/procurement/auto-group', procurementAdminController.triggerAutoProcurement);
router.get('/procurement/valuation', procurementAdminController.getValuationReport);
router.post('/procurement/adjustments', procurementAdminController.createAdjustment);
router.post('/procurement/adjustments/:id/reverse', procurementAdminController.reverseAdjustment);
router.get('/procurement/adjustments', procurementAdminController.getAdjustments);
router.get('/procurement/cost-history', procurementAdminController.getCostHistory);

// Phase 41 Financial Accounting, Expenses, Cash Management & Profitability Intelligence
const financialAdminController = require('../controllers/admin/financialAdmin.controller');
const expenseAdminController = require('../controllers/admin/expenseAdmin.controller');
const cashAdminController = require('../controllers/admin/cashAdmin.controller');

router.get('/finance/dashboard', financialAdminController.getDashboard);
router.get('/finance/profit-loss', financialAdminController.getProfitLoss);
router.get('/finance/payables', financialAdminController.getPayables);
router.post('/finance/payables/invoices', financialAdminController.createSupplierInvoice);
router.post('/finance/supplier-payments', financialAdminController.recordSupplierPayment);
router.post('/finance/supplier-payments/:id/reverse', financialAdminController.reverseSupplierPayment);
router.get('/finance/ledger', financialAdminController.getLedger);

router.get('/finance/expenses/categories', expenseAdminController.getCategories);
router.post('/finance/expenses/categories', expenseAdminController.createCategory);
router.get('/finance/expenses', expenseAdminController.getExpenses);
router.post('/finance/expenses', expenseAdminController.createExpense);
router.post('/finance/expenses/:id/approve', expenseAdminController.approveExpense);
router.post('/finance/expenses/:id/reject', expenseAdminController.rejectExpense);
router.post('/finance/expenses/:id/reverse', expenseAdminController.reverseExpense);
router.get('/finance/expenses/recurring', expenseAdminController.getRecurringExpenses);
router.post('/finance/expenses/recurring', expenseAdminController.createRecurringExpense);
router.post('/finance/expenses/recurring/process', expenseAdminController.triggerRecurringProcess);

router.get('/cash/session', cashAdminController.getCurrentSession);
router.post('/cash/open', cashAdminController.openSession);
router.post('/cash/movements', cashAdminController.recordMovement);
router.post('/cash/close', cashAdminController.closeSession);
router.get('/cash/history', cashAdminController.getSessionsHistory);

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
router.get('/deliveries/dashboard', deliveryAdminController.getAdminDeliveryDashboard);
router.get('/delivery-partners', deliveryAdminController.getDeliveryPartners);
router.post('/delivery-partners', deliveryAdminController.createDeliveryPartner);
router.get('/delivery/orders/unassigned', deliveryAdminController.getUnassignedOrders);
router.get('/deliveries/orders/unassigned', deliveryAdminController.getUnassignedOrders);
router.get('/deliveries/unassigned', deliveryAdminController.getUnassignedOrders);
router.get('/delivery/orders/assigned', deliveryAdminController.getAssignedDeliveries);
router.get('/deliveries/orders/assigned', deliveryAdminController.getAssignedDeliveries);
router.get('/deliveries/assigned', deliveryAdminController.getAssignedDeliveries);
router.get('/deliveries/failed', deliveryAdminController.getFailedDeliveries);
router.get('/delivery/orders/failed', deliveryAdminController.getFailedDeliveries);
router.post('/orders/:orderId/assign-delivery', deliveryAdminController.assignDeliveryPartner);
router.post('/deliveries/:orderId/assign', deliveryAdminController.assignDeliveryPartner);
router.post('/orders/:orderId/reassign-delivery', deliveryAdminController.reassignDeliveryPartner);
router.patch('/orders/:orderId/reassign-delivery', deliveryAdminController.reassignDeliveryPartner);
router.post('/deliveries/:orderId/reassign', deliveryAdminController.reassignFailedDelivery);
router.post('/deliveries/:orderId/retry', deliveryAdminController.retryFailedDelivery);
router.post('/deliveries/:orderId/return-to-store', deliveryAdminController.returnOrderToStore);
router.post('/deliveries/:orderId/cancel-after-failure', deliveryAdminController.cancelOrderAfterDeliveryFailure);
router.post('/deliveries/:orderId/whatsapp-link', deliveryAdminController.getWhatsAppClickToChatLink);
router.post('/deliveries/:orderId/whatsapp/resend', deliveryAdminController.getWhatsAppClickToChatLink);
router.get('/deliveries/:orderId/notifications', deliveryAdminController.getWhatsAppClickToChatLink);

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
