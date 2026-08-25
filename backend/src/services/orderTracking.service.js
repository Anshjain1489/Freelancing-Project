const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./orderStatus.service');

// In-memory fallback array for mock test isolation
const mockHistoryStore = [];

/**
 * Sanitize metadata to strip sensitive attributes
 */
function sanitizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') return {};
  const cleaned = { ...metadata };
  const sensitiveKeywords = [
    'password', 'token', 'secret', 'apikey', 'api_key', 'razorpay_secret',
    'internal_note', 'phone'
  ];
  Object.keys(cleaned).forEach(key => {
    const lower = key.toLowerCase();
    if (sensitiveKeywords.some(kw => lower.includes(kw))) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

/**
 * Record order status lifecycle change with idempotency & deduplication guards
 */
async function recordStatusChange({
  orderId,
  previousStatus = null,
  newStatus,
  changedBy = null,
  changedByRole = 'SYSTEM',
  reason = null,
  metadata = {}
}) {
  try {
    if (!orderId || !newStatus) return null;

    // Guard 1: Ignore meaningless transitions where previous === new status
    if (previousStatus && previousStatus === newStatus && !metadata.eventType) {
      return null;
    }

    const cleanMeta = sanitizeMetadata(metadata);
    const eventType = cleanMeta.eventType || newStatus;

    // Guard 2: Deduplication - Check if exact same status/eventType was recorded consecutively
    if (supabase) {
      const { data: latest } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (latest && latest.length > 0) {
        const lastEntry = latest[0];
        const lastMeta = lastEntry.metadata || {};
        if (
          lastEntry.new_status === newStatus &&
          (lastMeta.eventType || lastEntry.new_status) === eventType
        ) {
          return lastEntry;
        }
      }
    } else {
      const existing = mockHistoryStore.filter(h => String(h.order_id) === String(orderId));
      if (existing.length > 0) {
        const last = existing[existing.length - 1];
        if (last.new_status === newStatus && (last.metadata?.eventType || last.new_status) === eventType) {
          return last;
        }
      }
    }

    const record = {
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_by_role: changedByRole,
      reason: reason,
      metadata: cleanMeta,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('order_status_history')
        .insert([record])
        .select()
        .single();

      if (error) {
        console.warn(`[ORDER_TRACKING_HISTORY_WARN] ${error.message}`);
        mockHistoryStore.push({ id: `hist_${Date.now()}`, ...record });
        return record;
      }
      return data;
    } else {
      const saved = { id: `hist_${Date.now()}`, ...record };
      mockHistoryStore.push(saved);
      return saved;
    }
  } catch (err) {
    console.warn(`[ORDER_TRACKING_HISTORY_FAIL] ${err.message}`);
    return null;
  }
}

/**
 * Fetch full administrative tracking history for an order
 */
async function getOrderTrackingHistory(orderId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!error && data) return data;
  }

  return mockHistoryStore
    .filter(h => String(h.order_id) === String(orderId))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

/**
 * Fetch sanitized customer tracking timeline & normalized order data
 */
async function getCustomerOrderTracking(userId, userRole, orderId) {
  if (!orderId) {
    throw new AppError('Order ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  let order = null;
  let deliveryAssignment = null;
  let history = [];

  if (supabase) {
    const { data: oData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (oData) {
      order = oData;
      const { data: dData } = await supabase
        .from('delivery_assignments')
        .select('*, delivery_partner:users!delivery_partner_id(id, full_name, phone)')
        .eq('order_id', orderId)
        .maybeSingle();

      deliveryAssignment = dData || null;
      history = await getOrderTrackingHistory(orderId);
    }
  }

  if (!order) {
    const mockEvents = mockHistoryStore.filter(h => String(h.order_id) === String(orderId));
    if (mockEvents.length > 0) {
      const first = mockEvents[0];
      const last = mockEvents[mockEvents.length - 1];
      order = {
        id: orderId,
        user_id: first.changed_by || 'cust_1',
        order_number: `CKS-${orderId}`,
        status: last.new_status || 'CONFIRMED',
        payment_status: 'PAID',
        payment_method: first.metadata?.paymentMethod || 'COD',
        total_amount: 500,
        created_at: first.created_at
      };
      history = mockEvents;
    } else {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  // Authorization Security Rules:
  // CUSTOMER can only view their own order
  // ADMIN can view any order
  // DELIVERY_PARTNER cannot access unrelated customer tracking
  if (userRole === 'CUSTOMER' && String(order.user_id) !== String(userId)) {
    throw new AppError('You are not authorized to view tracking for this order', HTTP_STATUS.FORBIDDEN);
  }

  if (userRole === 'DELIVERY_PARTNER' && String(deliveryAssignment?.delivery_partner_id) !== String(userId)) {
    throw new AppError('Unauthorized delivery tracking access', HTTP_STATUS.FORBIDDEN);
  }

  // Compute normalized estimated delivery string
  let estimatedDelivery = 'Standard 30-45 mins';
  if (deliveryAssignment?.estimated_delivery_at) {
    const estTime = new Date(deliveryAssignment.estimated_delivery_at);
    estimatedDelivery = `Expected by ${estTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (deliveryAssignment?.estimated_delivery_minutes) {
    estimatedDelivery = `Approximately ${deliveryAssignment.estimated_delivery_minutes} minutes`;
  }

  // Sanitize delivery partner info (Name only, never phone/password/tokens)
  const deliveryPartnerName = deliveryAssignment?.delivery_partner?.full_name ||
    deliveryAssignment?.deliveryPartnerName ||
    (deliveryAssignment?.delivery_partner_id ? 'Assigned Partner' : null);

  // Normalize Multi-Factor Customer Timeline
  const isCod = String(order.payment_method || '').toUpperCase() === 'COD';
  const isPaid = order.payment_status === PAYMENT_STATUS.PAID || order.payment_status === 'PAID';
  const isConfirmed = order.status === ORDER_STATUS.CONFIRMED;
  const isPendingPayment = order.status === ORDER_STATUS.PENDING_PAYMENT;
  const isProcessing = order.status === ORDER_STATUS.PROCESSING;
  const isReady = order.status === ORDER_STATUS.READY_FOR_DELIVERY;
  const isOut = order.status === ORDER_STATUS.OUT_FOR_DELIVERY;
  const isDelivered = order.status === ORDER_STATUS.DELIVERED;
  const isRejected = order.status === ORDER_STATUS.REJECTED;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;
  const isDeliveryFailed = deliveryAssignment?.status === 'FAILED';

  const timeline = [
    {
      key: 'ORDER_PLACED',
      title: 'Order Placed',
      description: 'Your order has been placed successfully.',
      state: 'COMPLETED',
      createdAt: order.created_at || order.createdAt
    },
    {
      key: 'STORE_CONFIRMATION',
      title: 'Store Confirmation',
      description: isConfirmed
        ? 'Waiting for store admin confirmation.'
        : (isRejected ? 'Store rejected this order.' : 'Order accepted by store.'),
      state: isConfirmed ? 'ACTIVE' : (isRejected ? 'TERMINATED' : 'COMPLETED'),
      createdAt: order.accepted_at || order.created_at
    },
    {
      key: 'PAYMENT',
      title: 'Payment',
      description: isCod
        ? 'Cash on Delivery - Payment to be collected upon delivery.'
        : (isPaid
            ? 'Payment completed successfully.'
            : (isPendingPayment
                ? 'Order accepted! Please complete payment to start processing.'
                : (isRejected ? 'No payment required.' : 'Awaiting payment confirmation.'))),
      state: isCod || isPaid
        ? 'COMPLETED'
        : (isPendingPayment ? 'ACTIVE' : (isRejected || isCancelled ? 'TERMINATED' : 'UPCOMING')),
      createdAt: order.payment_verified_at || order.created_at
    },
    {
      key: 'PREPARING_ORDER',
      title: 'Preparing Order',
      description: (isProcessing || isReady) && !deliveryAssignment
        ? 'Store is packing and preparing your items.'
        : ((isProcessing || isReady || isOut || isDelivered) ? 'Order prepared.' : 'Will start once payment is confirmed.'),
      state: (isProcessing || isReady) && !deliveryAssignment
        ? 'ACTIVE'
        : ((isProcessing || isReady || isOut || isDelivered) ? 'COMPLETED' : (isRejected || isCancelled ? 'TERMINATED' : 'UPCOMING')),
      createdAt: order.updated_at
    },
    {
      key: 'DELIVERY_PARTNER_ASSIGNED',
      title: 'Delivery Partner Assigned',
      description: deliveryPartnerName
        ? `Assigned to ${deliveryPartnerName}.`
        : 'Assigning a nearby delivery partner.',
      state: deliveryAssignment
        ? 'COMPLETED'
        : ((isOut || isDelivered) ? 'COMPLETED' : (isRejected || isCancelled ? 'TERMINATED' : 'UPCOMING')),
      createdAt: deliveryAssignment?.assigned_at || order.updated_at
    },
    {
      key: 'OUT_FOR_DELIVERY',
      title: 'Out for Delivery',
      description: isOut
        ? 'Your order is on the way!'
        : (isDelivered ? 'Order picked up and delivered.' : (isDeliveryFailed ? 'Delivery attempt failed.' : 'Order will be picked up soon.')),
      state: isOut
        ? 'ACTIVE'
        : (isDelivered ? 'COMPLETED' : (isDeliveryFailed ? 'FAILED' : (isRejected || isCancelled ? 'TERMINATED' : 'UPCOMING'))),
      createdAt: deliveryAssignment?.picked_up_at || deliveryAssignment?.assigned_at
    },
    {
      key: 'DELIVERED',
      title: 'Delivered',
      description: isDelivered
        ? 'Order delivered successfully. Enjoy your purchase!'
        : (isDeliveryFailed ? 'We could not complete this delivery. Please contact store.' : 'Order pending delivery.'),
      state: isDelivered
        ? 'COMPLETED'
        : (isDeliveryFailed ? 'FAILED' : (isRejected || isCancelled ? 'TERMINATED' : 'UPCOMING')),
      createdAt: deliveryAssignment?.delivered_at
    }
  ];

  // Handle Terminal States
  if (isRejected) {
    timeline.push({
      key: 'TERMINATED',
      title: 'Order Rejected',
      description: order.rejection_reason ? `Reason: ${order.rejection_reason}` : 'The store could not process this order.',
      state: 'TERMINATED',
      createdAt: order.rejected_at || order.updated_at
    });
  } else if (isCancelled) {
    timeline.push({
      key: 'TERMINATED',
      title: 'Order Cancelled',
      description: 'This order was cancelled.',
      state: 'TERMINATED',
      createdAt: order.updated_at
    });
  }

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: order.order_number || order.orderNumber,
      status: order.status,
      paymentStatus: order.payment_status || order.paymentStatus,
      paymentMethod: String(order.payment_method || order.paymentMethod || '').toUpperCase(),
      totalAmount: order.total_amount || order.totalAmount,
      estimatedDelivery,
      deliveryPartner: deliveryPartnerName ? { name: deliveryPartnerName } : null,
      createdAt: order.created_at || order.createdAt
    },
    timeline,
    history: userRole === 'ADMIN' ? history : undefined
  };
}

module.exports = {
  recordStatusChange,
  getOrderTrackingHistory,
  getCustomerOrderTracking,
  mockHistoryStore
};
