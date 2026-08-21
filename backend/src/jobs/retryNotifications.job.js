const cron = require('node-cron');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { sendWhatsAppMessage } = require('../providers/whatsapp/whatsapp.client');

const retryFailedNotificationDeliveries = async () => {
  if (!supabase) return;

  try {
    const maxRetries = parseInt(process.env.NOTIFICATION_MAX_RETRIES, 10) || 3;
    const retryDelaySec = parseInt(process.env.NOTIFICATION_RETRY_DELAY_SECONDS, 10) || 60;
    const cutoffTime = new Date(Date.now() - retryDelaySec * 1000).toISOString();

    const { data: failedDeliveries } = await supabase
      .from('notification_deliveries')
      .select('*, notifications ( title, message, event_type )')
      .eq('status', 'FAILED')
      .lt('attempt_count', maxRetries)
      .lt('last_attempt_at', cutoffTime);

    if (failedDeliveries && failedDeliveries.length > 0) {
      logger.info(`[CRON_RETRY] Retrying ${failedDeliveries.length} failed notification deliveries...`);

      for (const d of failedDeliveries) {
        const attempt = d.attempt_count + 1;
        const res = await sendWhatsAppMessage({
          to: d.recipient,
          templateName: 'order_confirmed',
          fallbackText: d.notifications?.message || 'Chaudhary Kirana Store Notification'
        });

        if (res.success) {
          await supabase.from('notification_deliveries').update({
            status: res.status,
            provider_message_id: res.messageId,
            attempt_count: attempt,
            last_attempt_at: new Date().toISOString()
          }).eq('id', d.id);
        } else {
          await supabase.from('notification_deliveries').update({
            attempt_count: attempt,
            last_attempt_at: new Date().toISOString(),
            error_message: res.errorMessage
          }).eq('id', d.id);
        }
      }
    }
  } catch (err) {
    logger.error('[CRON_NOTIFICATION_RETRY_ERROR]', err);
  }
};

const initNotificationRetryJob = () => {
  cron.schedule('*/5 * * * *', () => {
    retryFailedNotificationDeliveries();
  });
};

module.exports = { retryFailedNotificationDeliveries, initNotificationRetryJob };
