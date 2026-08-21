const supabase = require('../config/supabase');
const { getWhatsAppConfig, sendWhatsAppMessage } = require('../providers/whatsapp/whatsapp.client');
const { getWhatsAppTemplate } = require('../providers/whatsapp/whatsapp.templates');
const { getPreferences } = require('./notificationPreference.service');
const EVENT_TYPES = require('../events/eventTypes');
const logger = require('../utils/logger');

// Local fallback memory store for delivery logs
const mockDeliveries = [];

const dispatchNotificationChannels = async ({ notificationId, userId, eventType, recipientPhone, data }) => {
  const waConfig = getWhatsAppConfig();

  // 1. Fetch user preferences if userId present
  let userPrefs = { inAppOrders: true, whatsappOrders: true, whatsappPromotions: false };
  if (userId) {
    try {
      userPrefs = await getPreferences(userId);
    } catch {}
  }

  // 2. Determine Customer WhatsApp Eligibility
  const isPromo = eventType === EVENT_TYPES.PROMOTION_CREATED;
  const isCustomerWaAllowed = isPromo ? userPrefs.whatsappPromotions : userPrefs.whatsappOrders;

  if (recipientPhone && isCustomerWaAllowed) {
    const waPayload = getWhatsAppTemplate(eventType, data);
    if (waPayload) {
      await sendChannelDelivery({
        notificationId,
        channel: 'WHATSAPP',
        recipient: recipientPhone,
        eventType,
        waPayload
      });
    }
  }

  // 3. Admin WhatsApp Notifications (for ORDER_CONFIRMED & LOW_STOCK)
  if (eventType === EVENT_TYPES.ORDER_CONFIRMED || eventType === EVENT_TYPES.LOW_STOCK) {
    const adminEventType = eventType === EVENT_TYPES.ORDER_CONFIRMED ? EVENT_TYPES.ADMIN_NEW_ORDER : EVENT_TYPES.LOW_STOCK;
    const adminWaPayload = getWhatsAppTemplate(adminEventType, data);

    if (adminWaPayload) {
      for (const adminPhone of waConfig.adminNumbers) {
        if (adminPhone) {
          await sendChannelDelivery({
            notificationId,
            channel: 'WHATSAPP',
            recipient: adminPhone,
            eventType: adminEventType,
            waPayload: adminWaPayload
          });
        }
      }
    }
  }
};

const sendChannelDelivery = async ({ notificationId, channel, recipient, eventType, waPayload }) => {
  if (supabase && notificationId) {
    // IDEMPOTENCY CHECK: Check if delivery already exists for this (notificationId, channel, recipient)
    const { data: existing } = await supabase.from('notification_deliveries')
      .select('id, status')
      .eq('notification_id', notificationId)
      .eq('channel', channel)
      .eq('recipient', recipient)
      .single();

    if (existing) {
      logger.info(`[IDEMPOTENT_SKIPPED] Notification delivery already exists for ${eventType} to ${recipient}`);
      return;
    }

    const { data: deliveryRecord } = await supabase.from('notification_deliveries').insert([{
      notification_id: notificationId,
      channel,
      recipient,
      status: 'PROCESSING',
      provider: 'WHATSAPP_CLOUD_API',
      attempt_count: 1,
      last_attempt_at: new Date().toISOString()
    }]).select().single();

    const result = await sendWhatsAppMessage({
      to: recipient,
      templateName: waPayload.templateName,
      components: waPayload.components,
      fallbackText: waPayload.fallbackText
    });

    if (result.success && deliveryRecord?.id) {
      await supabase.from('notification_deliveries').update({
        status: result.status,
        provider_message_id: result.messageId
      }).eq('id', deliveryRecord.id);
    } else if (deliveryRecord?.id) {
      await supabase.from('notification_deliveries').update({
        status: 'FAILED',
        error_code: String(result.errorCode || ''),
        error_message: result.errorMessage,
        failed_at: new Date().toISOString()
      }).eq('id', deliveryRecord.id);
    }

    return;
  }

  // Mock Fallback
  const key = `${notificationId}_${channel}_${recipient}`;
  if (mockDeliveries.some(d => d.key === key)) {
    return;
  }

  const result = await sendWhatsAppMessage({
    to: recipient,
    templateName: waPayload.templateName,
    components: waPayload.components,
    fallbackText: waPayload.fallbackText
  });

  mockDeliveries.push({
    key,
    notificationId,
    channel,
    recipient,
    status: result.status,
    messageId: result.messageId
  });
};

module.exports = { dispatchNotificationChannels };
