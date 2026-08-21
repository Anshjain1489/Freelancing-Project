const crypto = require('crypto');
const supabase = require('../../config/supabase');
const { getWhatsAppConfig } = require('./whatsapp.client');
const logger = require('../../utils/logger');

const verifyWebhookSubscription = (mode, token, challenge) => {
  const config = getWhatsAppConfig();
  if (mode === 'subscribe' && token === config.verifyToken) {
    return challenge;
  }
  return null;
};

const verifyWebhookPayloadSignature = (rawBody, signatureHeader) => {
  const config = getWhatsAppConfig();
  if (!config.appSecret || !signatureHeader) return true;

  try {
    const signature = signatureHeader.replace('sha256=', '');
    const expected = crypto
      .createHmac('sha256', config.appSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

const processWhatsAppWebhookEvent = async (body) => {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value || !value.statuses) {
    return { processed: false, reason: 'No status updates found' };
  }

  for (const statusObj of value.statuses) {
    const messageId = statusObj.id;
    const status = statusObj.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED

    if (supabase && messageId) {
      const updatePayload = {
        status: status === 'SENT' ? 'SENT' : status === 'DELIVERED' ? 'DELIVERED' : status === 'READ' ? 'READ' : 'FAILED',
        updated_at: new Date().toISOString()
      };

      if (status === 'DELIVERED') updatePayload.delivered_at = new Date().toISOString();
      if (status === 'FAILED') updatePayload.failed_at = new Date().toISOString();

      await supabase.from('notification_deliveries')
        .update(updatePayload)
        .eq('provider_message_id', messageId);
    }
  }

  return { processed: true, count: value.statuses.length };
};

module.exports = {
  verifyWebhookSubscription,
  verifyWebhookPayloadSignature,
  processWhatsAppWebhookEvent
};
