const express = require('express');
const healthRoutes = require('./health.routes');
const webhookRoutes = require('./webhook.routes');
const whatsappWebhookRoutes = require('./whatsappWebhook.routes');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const inventoryRoutes = require('./inventory.routes');
const cartRoutes = require('./cart.routes');
const addressRoutes = require('./address.routes');
const checkoutRoutes = require('./checkout.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const couponRoutes = require('./coupon.routes');
const deliveryRoutes = require('./delivery.routes');
const deliveryPartnerRoutes = require('./deliveryPartner.routes');
const cancellationRoutes = require('./cancellation.routes');
const returnRoutes = require('./return.routes');
const replacementRoutes = require('./replacement.routes');
const adminRoutes = require('./admin.routes');
const chatbotRoutes = require('./chatbot.routes');
const invoiceRoutes = require('./invoice.routes');
const { getSitemapXML } = require('../controllers/sitemap.controller');

const router = express.Router();

// 1. Public Sitemap XML Endpoint
router.get('/sitemap.xml', getSitemapXML);

// 2. Public Health & Diagnostic Endpoint
router.use('/health', healthRoutes);

// 3. Public Webhooks (Signature verified internally inside controllers, NO JWT authentication required)
router.use('/webhooks', webhookRoutes);
router.use('/webhooks', whatsappWebhookRoutes);

// 4. Feature Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/', cancellationRoutes);
router.use('/', returnRoutes);
router.use('/', replacementRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/delivery', deliveryPartnerRoutes);
router.use('/delivery-partner', deliveryPartnerRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationRoutes);
router.use('/admin', adminRoutes);
const replenishmentCustomerController = require('../controllers/replenishmentCustomer.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/customer/replenishment-recommendations', authenticate, replenishmentCustomerController.getCustomerReplenishments);
router.post('/customer/replenishment-recommendations/calculate', authenticate, replenishmentCustomerController.generateCustomerReplenishments);
router.post('/customer/replenishment-recommendations/:id/dismiss', authenticate, replenishmentCustomerController.dismissCustomerReplenishment);

router.use('/chatbot', chatbotRoutes);
router.use('/', invoiceRoutes);

module.exports = router;
