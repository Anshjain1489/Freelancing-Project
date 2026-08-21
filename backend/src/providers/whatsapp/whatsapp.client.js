const axios = require('axios');
const logger = require('../../utils/logger');

const getWhatsAppConfig = () => {
  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'chaudhary_kirana_wa_verify_2026',
    appSecret: process.env.WHATSAPP_APP_SECRET || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    adminNumbers: (process.env.ADMIN_WHATSAPP_NUMBERS || '7897837095,7007550184').split(',').map(n => n.trim())
  };
};

/**
 * Sends a WhatsApp Template or Text Message using Cloud API.
 */
const sendWhatsAppMessage = async ({ to, templateName, languageCode = 'en', components = [], fallbackText = '' }) => {
  const config = getWhatsAppConfig();

  // If WhatsApp API is not enabled or credentials not configured, operate in safe dev/mock mode
  if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
    logger.info(`[WHATSAPP_MOCK_DISPATCH] To: ${to} | Template: ${templateName} | Text: ${fallbackText}`);
    return {
      success: true,
      messageId: `wamid.mock.${Date.now()}.${Math.random().toString(36).substring(7)}`,
      status: 'SENT',
      mock: true
    };
  }

  const cleanPhone = to.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components
    }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const messageId = response.data?.messages?.[0]?.id || `wamid.${Date.now()}`;
    return {
      success: true,
      messageId,
      status: 'SENT',
      raw: response.data
    };
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    logger.error(`[WHATSAPP_SEND_ERROR] To: ${to} | Error: ${errorMsg}`);
    return {
      success: false,
      status: 'FAILED',
      errorCode: err.response?.data?.error?.code || 500,
      errorMessage: errorMsg
    };
  }
};

module.exports = {
  getWhatsAppConfig,
  sendWhatsAppMessage
};
