const cron = require('node-cron');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { ORDER_STATUS } = require('../services/orderStatus.service');

const expirePendingOrders = async () => {
  if (!supabase) return;

  try {
    const expiryMinutes = parseInt(process.env.PENDING_ORDER_EXPIRY_MINUTES, 10) || 30;
    const cutoffTime = new Date(Date.now() - expiryMinutes * 60 * 1000).toISOString();

    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .update({ status: ORDER_STATUS.PAYMENT_FAILED })
      .eq('status', ORDER_STATUS.PENDING_PAYMENT)
      .lt('created_at', cutoffTime)
      .select('id, order_number');

    if (expiredOrders && expiredOrders.length > 0) {
      logger.info(`[CRON] Expired ${expiredOrders.length} unpaid pending orders older than ${expiryMinutes} minutes.`);
    }
  } catch (err) {
    logger.error('[CRON] Error expiring pending orders:', err);
  }
};

const initOrderExpirationJob = () => {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', () => {
    expirePendingOrders();
  });
};

module.exports = { expirePendingOrders, initOrderExpirationJob };
