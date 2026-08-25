const supabase = require('../config/supabase');
const sseManager = require('../notifications/sse.manager');
const logger = require('../utils/logger');

const SENSITIVE_EVENT_FIELDS = [
  'admin_notes',
  'adminNotes',
  'internal_notes',
  'internalNotes',
  'failure_notes',
  'failureNotes',
  'rejection_reason_internal',
  'delivery_otp_hash',
  'deliveryOtpHash',
  'delivery_otp_encrypted',
  'deliveryOtpEncrypted',
  'rawOtp',
  'otp',
  'password',
  'token',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'razorpaySecret',
  'signature'
];

/**
 * Sanitizes an SSE event object so internal admin/security fields are stripped.
 */
const sanitizeCustomerPayload = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeCustomerPayload);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_EVENT_FIELDS.includes(key)) {
      continue; // Omit sensitive field
    }
    if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeCustomerPayload(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Customer-friendly default status messages.
 */
const getCustomerStatusMessage = (status, customMessage = null) => {
  if (customMessage && typeof customMessage === 'string') {
    return customMessage;
  }
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Your order has been accepted. Please complete payment.';
    case 'CONFIRMED':
      return 'Your order is confirmed and waiting for store review.';
    case 'PROCESSING':
      return 'Your order has been accepted and is being prepared.';
    case 'OUT_FOR_DELIVERY':
      return 'Your order is out for delivery with our delivery partner!';
    case 'DELIVERED':
      return 'Your order has been successfully delivered 🎉';
    case 'DELIVERY_FAILED':
      return 'We encountered an issue during delivery. Store team is resolving this.';
    case 'RETURN_TO_STORE':
      return 'Your delivery is returning to the store.';
    case 'CANCELLED':
      return 'Your order has been cancelled.';
    case 'REJECTED':
      return 'Unfortunately, your order could not be accepted.';
    default:
      return `Order status updated to ${status}.`;
  }
};

/**
 * Single source of truth for order status SSE event emissions.
 */
const emitOrderStatusUpdate = async ({
  orderId,
  status,
  previousStatus = null,
  userId = null,
  message = null,
  metadata = {}
}) => {
  if (!orderId || !status) {
    logger.warn('[ORDER_REALTIME] emitOrderStatusUpdate invoked without orderId or status');
    return null;
  }

  let targetUserId = userId;

  // Resolve target userId from Supabase database if omitted
  if (!targetUserId && supabase) {
    try {
      const { data: ord } = await supabase.from('orders')
        .select('user_id')
        .eq('id', orderId)
        .maybeSingle();

      if (ord) {
        targetUserId = ord.user_id;
      }
    } catch (err) {
      logger.error('[ORDER_REALTIME_ERR] Failed to resolve userId for order:', orderId);
    }
  }

  const nowIso = new Date().toISOString();
  const customerMessage = getCustomerStatusMessage(status, message);

  const rawPayload = {
    eventType: 'ORDER_STATUS_UPDATED',
    type: 'ORDER_STATUS_UPDATED',
    orderId: String(orderId),
    status,
    previousStatus: previousStatus || null,
    userId: targetUserId ? String(targetUserId) : null,
    updatedAt: nowIso,
    message: customerMessage,
    metadata: metadata || {}
  };

  const cleanPayload = sanitizeCustomerPayload(rawPayload);

  // 1. Dispatch to all active SSE connections for the target customer
  if (targetUserId) {
    sseManager.sendToUser(targetUserId, cleanPayload);
  }

  // 2. Dispatch to all connected Admin SSE dashboard connections
  sseManager.broadcastToAdmins({
    ...cleanPayload,
    adminNotice: true
  });

  logger.info(`[ORDER_REALTIME_SUCCESS] Emitted status ${status} for orderId=${orderId} to userId=${targetUserId}`);
  return cleanPayload;
};

module.exports = {
  emitOrderStatusUpdate,
  sanitizeCustomerPayload,
  getCustomerStatusMessage
};
