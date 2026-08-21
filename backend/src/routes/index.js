const express = require('express');
const healthRoutes = require('./health.routes');
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
const webhookRoutes = require('./webhook.routes');
const notificationRoutes = require('./notification.routes');
const whatsappWebhookRoutes = require('./whatsappWebhook.routes');
const adminRoutes = require('./admin.routes');
const chatbotRoutes = require('./chatbot.routes');
const { getSitemapXML } = require('../controllers/sitemap.controller');

const router = express.Router();

// Public Sitemap XML Endpoint
router.get('/sitemap.xml', getSitemapXML);

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/webhooks', whatsappWebhookRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/chatbot', chatbotRoutes);

module.exports = router;
