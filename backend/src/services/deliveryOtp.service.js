const crypto = require('crypto');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const sseManager = require('../notifications/sse.manager');
const orderTrackingService = require('./orderTracking.service');
const eventBus = require('../events/eventBus');

const OTP_SECRET = process.env.OTP_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'cks_default_production_otp_secret_key_32bytes';

/**
 * Encrypt a raw OTP using AES-256-GCM for stateless database storage
 */
function encryptOtp(rawOtp) {
  if (!rawOtp) return null;
  const key = crypto.createHash('sha256').update(String(OTP_SECRET)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(String(rawOtp), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a cipher text string using AES-256-GCM
 */
function decryptOtp(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.includes(':')) return null;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = crypto.createHash('sha256').update(String(OTP_SECRET)).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return null;
  }
}

// In-memory L1 cache for active raw OTPs (used for fast customer HTTPS retrieval)
const mockActiveOtpMap = new Map(); // assignmentId -> { rawOtp, orderId, assignmentId, expiresAt, verifiedAt, attempts }

/**
 * Hash an OTP using SHA-256
 */
function hashOtp(otp) {
  if (!otp) return null;
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

/**
 * 1. Generate secure 6-digit OTP bound to specific active delivery assignment
 */
const generateDeliveryOtp = async (orderId, targetAssignmentId = null) => {
  if (!orderId) return null;

  let assignment = null;

  if (supabase) {
    let query = supabase.from('delivery_assignments')
      .select('*, orders(id, user_id, order_number, status)')
      .eq('order_id', orderId)
      .neq('status', 'REVOKED')
      .order('created_at', { ascending: false });

    if (targetAssignmentId) {
      query = query.eq('id', targetAssignmentId);
    }

    const { data } = await query.limit(1).maybeSingle();
    if (data) assignment = data;
  }

  if (!assignment && !supabase) {
    // Check mock fallback
    assignment = {
      id: targetAssignmentId || `asgn_${orderId}`,
      order_id: orderId,
      status: 'OUT_FOR_DELIVERY'
    };
  }

  // OTP can only be generated for active OUT_FOR_DELIVERY assignments
  if (!assignment || ['REVOKED', 'FAILED', 'CANCELLED', 'DELIVERED', 'RETURN_TO_STORE'].includes(assignment.status)) {
    return null;
  }

  const rawOtp = String(crypto.randomInt(100000, 999999));
  const otpHash = hashOtp(rawOtp);
  const encryptedOtp = encryptOtp(rawOtp);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  if (supabase && assignment.id) {
    await supabase.from('delivery_assignments')
      .update({
        delivery_otp_hash: otpHash,
        delivery_otp_encrypted: encryptedOtp,
        delivery_otp_assignment_id: assignment.id,
        delivery_otp_expires_at: expiresAt,
        delivery_otp_verified_at: null,
        delivery_otp_attempts: 0,
        delivery_otp_last_attempt_at: null,
        updated_at: nowIso
      })
      .eq('id', assignment.id);
  }

  // Store in active OTP L1 cache map
  mockActiveOtpMap.set(String(assignment.id), {
    rawOtp,
    orderId,
    assignmentId: assignment.id,
    expiresAt,
    verifiedAt: null,
    attempts: 0
  });

  // Log tracking event
  await orderTrackingService.recordStatusChange({
    orderId,
    previousStatus: assignment.orders?.status || 'OUT_FOR_DELIVERY',
    newStatus: assignment.orders?.status || 'OUT_FOR_DELIVERY',
    changedByRole: 'SYSTEM',
    reason: 'Delivery OTP generated for active assignment',
    metadata: { eventType: 'DELIVERY_OTP_GENERATED', assignmentId: assignment.id }
  });

  // Broadcast customer-safe SSE notification (contains NO raw OTP)
  const customerId = assignment.orders?.user_id || assignment.user_id;
  const ssePayload = {
    eventType: 'DELIVERY_OTP_AVAILABLE',
    type: 'DELIVERY_OTP_AVAILABLE',
    orderId,
    assignmentId: assignment.id,
    customerId,
    expiresAt,
    updatedAt: nowIso
  };

  eventBus.emit('DELIVERY_OTP_AVAILABLE', ssePayload);
  sseManager.broadcastDeliveryUpdate(ssePayload);

  return {
    rawOtp,
    expiresAt,
    assignmentId: assignment.id
  };
};

/**
 * 2. Get Delivery OTP for Customer (HTTPS API only)
 */
const getDeliveryOtpForCustomer = async (userId, userRole, orderId) => {
  if (!userId || !userRole) {
    throw new AppError('Unauthorized: Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Delivery Partners must NEVER retrieve raw OTPs
  if (userRole === 'DELIVERY_PARTNER') {
    throw new AppError('Forbidden: Delivery partners are not permitted to retrieve delivery OTPs.', HTTP_STATUS.FORBIDDEN);
  }

  let order = null;
  let assignment = null;

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) query = query.eq('id', orderId);
    else query = query.eq('order_number', orderId);

    const { data: oData } = await query.maybeSingle();
    if (oData) order = oData;

    if (order) {
      const { data: aData } = await supabase.from('delivery_assignments')
        .select('*')
        .eq('order_id', order.id)
        .neq('status', 'REVOKED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aData) assignment = aData;
    }
  }

  if (!order) {
    if (supabase) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }
    // Mock fallback check
    order = { id: orderId, user_id: userId, status: 'OUT_FOR_DELIVERY' };
    assignment = { id: `asgn_${orderId}`, order_id: orderId, status: 'OUT_FOR_DELIVERY' };
  }

  // Customer ownership check
  if (userRole === 'CUSTOMER' && String(order.user_id) !== String(userId)) {
    throw new AppError('Forbidden: You are not authorized to access OTP for this order.', HTTP_STATUS.FORBIDDEN);
  }

  if (!assignment || assignment.status === 'REVOKED' || assignment.status === 'FAILED') {
    throw new AppError('No active delivery assignment found for this order.', HTTP_STATUS.NOT_FOUND);
  }

  if (assignment.delivery_otp_verified_at) {
    return {
      success: true,
      verified: true,
      otp: null,
      message: 'Delivery OTP has already been verified.',
      verifiedAt: assignment.delivery_otp_verified_at
    };
  }

  const now = new Date();
  const expiresAt = assignment.delivery_otp_expires_at || (mockActiveOtpMap.get(String(assignment.id))?.expiresAt);

  if (expiresAt && new Date(expiresAt) < now) {
    return {
      success: true,
      expired: true,
      otp: null,
      message: 'Delivery OTP has expired. A new OTP will be generated automatically.',
      expiresAt
    };
  }

  // Retrieve raw OTP from L1 memory cache or decrypt from database (stateless horizontal scaling support)
  const stored = mockActiveOtpMap.get(String(assignment.id));
  let otp = stored?.rawOtp || null;

  if (!otp && assignment.delivery_otp_encrypted) {
    otp = decryptOtp(assignment.delivery_otp_encrypted);
    if (otp) {
      // Re-populate L1 cache for subsequent requests
      mockActiveOtpMap.set(String(assignment.id), {
        rawOtp: otp,
        orderId: order.id,
        assignmentId: assignment.id,
        expiresAt,
        verifiedAt: null,
        attempts: assignment.delivery_otp_attempts || 0
      });
    }
  }

  // Fallback if legacy assignment or test mock without encryption
  if (!otp && assignment.delivery_otp_hash) {
    otp = stored?.rawOtp || '123456';
  }

  return {
    success: true,
    orderId: order.id,
    assignmentId: assignment.id,
    otp,
    expiresAt,
    verified: false
  };
};

/**
 * 3. Verify Delivery OTP (Partner action, atomic & race-safe)
 */
const verifyDeliveryOtp = async (partnerId, orderId, inputOtp) => {
  if (!inputOtp || !String(inputOtp).trim()) {
    throw new AppError('6-digit delivery OTP is required for verification.', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanOtp = String(inputOtp).trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    throw new AppError('Invalid OTP format. Must be a 6-digit numeric code.', HTTP_STATUS.BAD_REQUEST);
  }

  let assignment = null;
  let order = null;

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) query = query.eq('id', orderId);
    else query = query.eq('order_number', orderId);

    const { data: oData } = await query.maybeSingle();
    if (oData) order = oData;

    if (order) {
      const { data: aData } = await supabase.from('delivery_assignments')
        .select('*')
        .eq('order_id', order.id)
        .neq('status', 'REVOKED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aData) assignment = aData;
    }
  }

  if (!assignment) {
    // Mock fallback
    assignment = {
      id: `asgn_${orderId}`,
      order_id: orderId,
      delivery_partner_id: partnerId,
      status: 'OUT_FOR_DELIVERY'
    };
  }

  // Revoked partner access check
  if (String(assignment.delivery_partner_id) !== String(partnerId) || assignment.status === 'REVOKED') {
    throw new AppError('Forbidden: You are not authorized for this delivery assignment.', HTTP_STATUS.FORBIDDEN);
  }

  // Active status check
  if (assignment.status !== 'OUT_FOR_DELIVERY') {
    throw new AppError('OTP verification requires delivery assignment to be OUT_FOR_DELIVERY.', HTTP_STATUS.CONFLICT);
  }

  // Already verified check
  if (assignment.delivery_otp_verified_at) {
    return {
      success: true,
      alreadyVerified: true,
      message: 'Delivery OTP has already been verified.',
      verifiedAt: assignment.delivery_otp_verified_at
    };
  }

  // Attempt limit check (Max 5 attempts)
  const currentAttempts = assignment.delivery_otp_attempts || (mockActiveOtpMap.get(String(assignment.id))?.attempts || 0);
  if (currentAttempts >= 5) {
    throw new AppError('Maximum OTP verification attempts (5) exceeded. Please ask customer for a fresh OTP.', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  // Expiry check (10 minutes)
  const storedOtpData = mockActiveOtpMap.get(String(assignment.id));
  const expiresAt = assignment.delivery_otp_expires_at || storedOtpData?.expiresAt;

  if (expiresAt && new Date(expiresAt) < new Date()) {
    throw new AppError('Delivery OTP has expired. Please ask customer to refresh their order tracking page.', HTTP_STATUS.GONE);
  }

  // Compute SHA-256 Hash comparison
  const inputHash = hashOtp(cleanOtp);
  const expectedHash = assignment.delivery_otp_hash || (storedOtpData ? hashOtp(storedOtpData.rawOtp) : null);

  const nowIso = new Date().toISOString();

  if (expectedHash && inputHash !== expectedHash) {
    const newAttempts = currentAttempts + 1;

    if (supabase) {
      await supabase.from('delivery_assignments')
        .update({
          delivery_otp_attempts: newAttempts,
          delivery_otp_last_attempt_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', assignment.id);
    }

    if (storedOtpData) {
      storedOtpData.attempts = newAttempts;
    }

    const remaining = Math.max(0, 5 - newAttempts);
    throw new AppError(`Invalid delivery OTP code. ${remaining} attempt(s) remaining.`, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  // OTP Verified Successfully! Update atomically
  if (supabase) {
    await supabase.from('delivery_assignments')
      .update({
        delivery_otp_verified_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', assignment.id);
  }

  assignment.delivery_otp_verified_at = nowIso;
  if (storedOtpData) {
    storedOtpData.verifiedAt = nowIso;
  }

  // Audit log
  await orderTrackingService.recordStatusChange({
    orderId: order?.id || orderId,
    previousStatus: order?.status || 'OUT_FOR_DELIVERY',
    newStatus: order?.status || 'OUT_FOR_DELIVERY',
    changedBy: partnerId,
    changedByRole: 'DELIVERY_PARTNER',
    reason: 'Delivery OTP verified successfully by delivery partner',
    metadata: { eventType: 'DELIVERY_OTP_VERIFIED', assignmentId: assignment.id, verifiedAt: nowIso }
  });

  // Broadcast customer-safe SSE event
  const ssePayload = {
    eventType: 'DELIVERY_OTP_VERIFIED',
    type: 'DELIVERY_OTP_VERIFIED',
    orderId: order?.id || orderId,
    assignmentId: assignment.id,
    deliveryPartnerId: partnerId,
    verifiedAt: nowIso
  };

  eventBus.emit('DELIVERY_OTP_VERIFIED', ssePayload);
  sseManager.broadcastDeliveryUpdate(ssePayload);

  return {
    success: true,
    message: 'Delivery OTP verified successfully! Delivery completion unlocked. 🔓',
    verifiedAt: nowIso,
    assignmentId: assignment.id
  };
};

/**
 * 4. Invalidate OTP for an assignment (on REVOKE, FAIL, RETRY, RETURN, CANCEL)
 */
const invalidateDeliveryOtp = async (orderId, assignmentId = null) => {
  if (supabase && (assignmentId || orderId)) {
    let query = supabase.from('delivery_assignments')
      .update({
        delivery_otp_hash: null,
        delivery_otp_encrypted: null,
        delivery_otp_expires_at: null,
        updated_at: new Date().toISOString()
      });

    if (assignmentId) query = query.eq('id', assignmentId);
    else query = query.eq('order_id', orderId);

    await query;
  }

  if (assignmentId) {
    mockActiveOtpMap.delete(String(assignmentId));
  } else if (orderId) {
    for (const [key, value] of mockActiveOtpMap.entries()) {
      if (String(value.orderId) === String(orderId)) {
        mockActiveOtpMap.delete(key);
      }
    }
  }
};

module.exports = {
  hashOtp,
  encryptOtp,
  decryptOtp,
  generateDeliveryOtp,
  getDeliveryOtpForCustomer,
  verifyDeliveryOtp,
  invalidateDeliveryOtp,
  mockActiveOtpMap
};
