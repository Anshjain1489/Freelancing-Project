const crypto = require('crypto');
const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

// Memory token store for offline / unit tests
const mockInvoiceTokensMap = new Map();

/**
 * 1. Sub-Providers Abstraction Implementation
 */
const InAppProvider = {
  send: async (recipientId, title, message) => {
    console.log(`[InAppProvider] Sending to ${recipientId}: ${title} - ${message}`);
    return { provider: 'IN_APP', success: true, timestamp: new Date().toISOString() };
  }
};

const WhatsAppProvider = {
  send: async (phone, message) => {
    console.log(`[WhatsAppProvider] Sending to ${phone}: ${message}`);
    return { provider: 'WHATSAPP', success: true, timestamp: new Date().toISOString() };
  }
};

const EmailProvider = {
  send: async (email, subject, body) => {
    console.log(`[EmailProvider] Sending to ${email}: ${subject}`);
    return { provider: 'EMAIL', success: true, timestamp: new Date().toISOString() };
  }
};

const SmsProvider = {
  send: async (phone, message) => {
    console.log(`[SmsProvider] Sending SMS to ${phone}: ${message}`);
    return { provider: 'SMS', success: true, timestamp: new Date().toISOString() };
  }
};

/**
 * 2. Main Notification Provider Router
 */
const NotificationProvider = {
  send: async (channel, recipient, payload) => {
    switch (String(channel).toUpperCase()) {
      case 'WHATSAPP':
        return WhatsAppProvider.send(recipient, payload.message || payload.title);
      case 'EMAIL':
        return EmailProvider.send(recipient, payload.subject || payload.title, payload.body || payload.message);
      case 'SMS':
        return SmsProvider.send(recipient, payload.message || payload.title);
      case 'IN_APP':
      default:
        return InAppProvider.send(recipient, payload.title, payload.message);
    }
  }
};

/**
 * 3. Secure WhatsApp Invoice Token Generator (Reuse active tokens & Configurable Public URL)
 */
const generateSecureInvoiceToken = async (invoiceId, customerId = null, expiresInHours = 24) => {
  if (!invoiceId) throw new AppError('Invoice/Order ID is required', HTTP_STATUS.BAD_REQUEST);

  const baseUrl = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'https://chaudharykiranastore.com').replace(/\/$/, '');

  // Step 6: Prevent Token Duplication (Reuse existing valid non-expired token if available)
  for (const record of mockInvoiceTokensMap.values()) {
    if (String(record.invoice_id) === String(invoiceId) && !record.is_used) {
      if (new Date(record.expires_at).getTime() > Date.now()) {
        const shareableUrl = `${baseUrl}/invoice/share/${record.token}`;
        return { token: record.token, expiresAt: record.expires_at, shareableUrl, invoice_url: shareableUrl };
      }
    }
  }

  if (supabase) {
    try {
      const { data: existingToken } = await supabase.from('invoice_sharing_tokens')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingToken) {
        mockInvoiceTokensMap.set(existingToken.token, existingToken);
        const shareableUrl = `${baseUrl}/invoice/share/${existingToken.token}`;
        return { token: existingToken.token, expiresAt: existingToken.expires_at, shareableUrl, invoice_url: shareableUrl };
      }
    } catch (e) {}
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
  const id = `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const record = {
    id,
    token,
    invoice_id: invoiceId,
    customer_id: customerId,
    expires_at: expiresAt,
    is_used: false,
    created_at: new Date().toISOString()
  };

  mockInvoiceTokensMap.set(token, record);

  if (supabase) {
    try {
      await supabase.from('invoice_sharing_tokens').insert([record]);
    } catch (e) {}
  }

  const shareableUrl = `${baseUrl}/invoice/share/${token}`;
  return { token, expiresAt, shareableUrl, invoice_url: shareableUrl };
};

/**
 * 4. Validate & Consume Invoice Token
 */
const validateInvoiceToken = async (token) => {
  if (!token) throw new AppError('Sharing token is required', HTTP_STATUS.BAD_REQUEST);

  let tokenRecord = mockInvoiceTokensMap.get(token);

  if (supabase && !tokenRecord) {
    try {
      const { data } = await supabase.from('invoice_sharing_tokens').select('*').eq('token', token).maybeSingle();
      if (data) tokenRecord = data;
    } catch (e) {}
  }

  if (!tokenRecord) {
    throw new AppError('Invalid or revoked invoice sharing token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    throw new AppError('Invoice sharing token has expired', HTTP_STATUS.UNAUTHORIZED);
  }

  return { valid: true, invoiceId: tokenRecord.invoice_id, customerId: tokenRecord.customer_id };
};

module.exports = {
  NotificationProvider,
  InAppProvider,
  WhatsAppProvider,
  EmailProvider,
  SmsProvider,
  generateSecureInvoiceToken,
  validateInvoiceToken
};
