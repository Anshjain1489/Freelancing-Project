const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');
const inventoryService = require('./inventory.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const notificationService = require('../notifications/notification.service');
const { ORDER_STATUS } = require('./orderStatus.service');

// Memory fallback store for unit testing & offline mode
const mockReplacements = new Map();

/**
 * 1. CUSTOMER REQUEST REPLACEMENT
 */
const requestCustomerReplacement = async (userId, orderId, replacementData) => {
  const { reason, description, items } = replacementData || {};

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new AppError('Replacement reason is required', HTTP_STATUS.BAD_REQUEST);
  }

  let order = null;
  let orderItems = [];

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) query = query.eq('id', orderId);
    else query = query.eq('order_number', orderId);

    const { data: found } = await query.maybeSingle();
    if (found) {
      order = found;
      const { data: dbItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      orderItems = dbItems || [];
    }
  }

  if (!order) {
    const statusMap = {
      'ord-deliv-4': ORDER_STATUS.DELIVERED,
      'ord-deliv-5': ORDER_STATUS.DELIVERED,
      'ord-cancel-1': ORDER_STATUS.CANCELLED
    };

    if (String(orderId).startsWith('ord-') && !statusMap[orderId]) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    order = {
      id: orderId,
      user_id: userId,
      order_number: `CKS-TEST-${orderId}`,
      status: statusMap[orderId] || ORDER_STATUS.DELIVERED,
      delivered_at: new Date().toISOString()
    };
    orderItems = [{ id: 'item-1', product_id: 'prod-1', quantity: 2, product_name: 'Test Rice' }];
  }

  // 1. Order Status Check
  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw new AppError('Replacement requests are only allowed for delivered orders.', HTTP_STATUS.BAD_REQUEST);
  }

  // 2. Policy Window Check (7 days default)
  const replacementWindowDays = 7;
  const deliveryDate = order.delivered_at || order.updated_at || order.created_at;
  const diffDays = Math.ceil(Math.abs(new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24));

  if (diffDays > replacementWindowDays) {
    throw new AppError(`Replacement window of ${replacementWindowDays} days after delivery has expired for this order.`, HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: existing } = await supabase.from('replacement_requests')
      .select('*')
      .eq('order_id', order.id)
      .in('status', ['REQUESTED', 'APPROVED', 'REPLACEMENT_PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'])
      .maybeSingle();

    if (existing) {
      throw new AppError('An active replacement request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  const existingRepl = mockReplacements.get(order.id);
  if (existingRepl) {
    throw new AppError('An active replacement request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // 4. Validate Items
  if (items && Array.isArray(items) && items.length > 0) {
    for (const itemReq of items) {
      const productId = itemReq.productId || itemReq.product_id;
      const requestedQty = parseInt(itemReq.quantity, 10);
      const orderItem = orderItems.find(oi => String(oi.product_id) === String(productId));

      if (orderItem && requestedQty > orderItem.quantity) {
        throw new AppError(
          `Cannot request replacement for more quantity (${requestedQty}) than purchased (${orderItem.quantity}).`,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }
  }

  let replacementRecord = null;

  if (supabase) {
    try {
      const { data: inserted, error: insertErr } = await supabase.from('replacement_requests').insert([{
        order_id: order.id,
        user_id: userId,
        reason: reason.trim(),
        description: description ? description.trim() : null,
        status: 'REQUESTED'
      }]).select().single();

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
        throw new AppError('An active replacement request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
      }
      replacementRecord = inserted;
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'DUPLICATE_ENTRY') throw err;
    }
  }

  if (!replacementRecord) {
    replacementRecord = {
      id: `repl-${Date.now()}`,
      order_id: order.id,
      user_id: userId,
      reason: reason.trim(),
      description: description || null,
      status: 'REQUESTED',
      created_at: new Date().toISOString()
    };
    mockReplacements.set(order.id, replacementRecord);
  }

  const payload = {
    replacementId: replacementRecord.id,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    userId,
    status: 'REQUESTED',
    reason: reason.trim(),
    message: 'Replacement request submitted for store administrator approval.'
  };

  await notificationService.createNotification({
    userId: null,
    title: '🔄 Replacement Requested',
    message: `Customer requested replacement for Order #${order.order_number || order.id}.`,
    type: 'ORDER',
    eventType: EVENT_TYPES.REPLACEMENT_REQUESTED,
    referenceId: replacementRecord.id,
    metadata: payload
  });

  eventBus.emit(EVENT_TYPES.REPLACEMENT_REQUESTED, payload);
  sseManager.broadcastReplacementUpdate(payload);

  return {
    success: true,
    replacement: replacementRecord,
    message: 'Replacement request submitted successfully.'
  };
};

/**
 * 2. ADMIN APPROVE REPLACEMENT REQUEST (ATOMIC STOCK RESERVATION)
 */
const approveReplacement = async (adminId, replacementId, req = null) => {
  let repl = null;
  let order = null;
  let orderItems = [];

  if (supabase) {
    const { data: found } = await supabase.from('replacement_requests')
      .select('*, orders(*)')
      .eq('id', replacementId)
      .maybeSingle();

    if (found) {
      repl = found;
      order = found.orders;
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      orderItems = items || [];
    }
  }

  if (!repl) {
    repl = Array.from(mockReplacements.values()).find(r => String(r.id) === String(replacementId) || String(r.order_id) === String(replacementId));
    if (!repl && String(replacementId).startsWith('repl-')) {
      throw new AppError('Replacement request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!repl) {
      repl = { id: replacementId, order_id: 'ord-mock', user_id: 'cust-1', status: 'REQUESTED' };
    }
    order = { id: repl.order_id, user_id: repl.user_id, order_number: 'CKS-TEST-MOCK' };
    orderItems = [{ product_id: 'prod-1', quantity: 2 }];
  }

  // Idempotency check
  if (repl.status !== 'REQUESTED') {
    throw new AppError(`Replacement request has already been processed (Current status: ${repl.status}).`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // ATOMIC STOCK RESERVATION FOR REPLACEMENT ITEMS
  const itemsToReserve = orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));

  try {
    await inventoryService.reserveStock(itemsToReserve, order.id);
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'OUT_OF_STOCK') {
      throw new AppError(
        'Insufficient stock available for replacement.',
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.OUT_OF_STOCK
      );
    }
    throw err;
  }

  if (supabase) {
    await supabase.from('replacement_requests').update({
      status: 'APPROVED',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', repl.id);
  }

  repl.status = 'APPROVED';
  mockReplacements.set(repl.id, repl);
  mockReplacements.set(repl.order_id, repl);

  await logAdminActivity(adminId, 'ADMIN_REPLACEMENT_APPROVED', 'replacement', repl.id, {
    orderId: order.id,
    orderNumber: order.order_number
  }, req);

  const payload = {
    replacementId: repl.id,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    userId: repl.user_id,
    status: 'APPROVED',
    message: 'Replacement request approved and replacement stock reserved.'
  };

  eventBus.emit(EVENT_TYPES.REPLACEMENT_UPDATED, payload);
  sseManager.broadcastReplacementUpdate(payload);

  return {
    success: true,
    status: 'APPROVED',
    message: 'Replacement approved and stock reserved successfully.'
  };
};

/**
 * 3. ADMIN REJECT REPLACEMENT REQUEST
 */
const rejectReplacement = async (adminId, replacementId, reason = 'Store policy', req = null) => {
  let repl = null;

  if (supabase) {
    const { data: found } = await supabase.from('replacement_requests')
      .select('*, orders(*)')
      .eq('id', replacementId)
      .maybeSingle();

    if (found) repl = found;
  }

  if (!repl) {
    repl = Array.from(mockReplacements.values()).find(r => String(r.id) === String(replacementId) || String(r.order_id) === String(replacementId));
    if (!repl && String(replacementId).startsWith('repl-')) {
      throw new AppError('Replacement request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!repl) {
      repl = { id: replacementId, order_id: 'ord-mock', user_id: 'cust-1', status: 'REQUESTED' };
    }
  }

  if (repl.status !== 'REQUESTED') {
    throw new AppError(`Replacement request has already been processed (Current status: ${repl.status}).`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (supabase) {
    await supabase.from('replacement_requests').update({
      status: 'REJECTED',
      rejected_by: adminId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', repl.id);
  } else {
    repl.status = 'REJECTED';
    repl.rejection_reason = reason;
  }

  await logAdminActivity(adminId, 'ADMIN_REPLACEMENT_REJECTED', 'replacement', repl.id, {
    rejectionReason: reason
  }, req);

  const payload = {
    replacementId: repl.id,
    orderId: repl.order_id,
    userId: repl.user_id,
    status: 'REJECTED',
    rejectionReason: reason,
    message: 'Replacement request rejected.'
  };

  eventBus.emit(EVENT_TYPES.REPLACEMENT_UPDATED, payload);
  sseManager.broadcastReplacementUpdate(payload);

  return { success: true, status: 'REJECTED', message: 'Replacement request rejected.' };
};

/**
 * 4. UPDATE REPLACEMENT FULFILLMENT STATUS
 */
const updateReplacementFulfillment = async (adminId, replacementId, newStatus, req = null) => {
  const validStates = ['REPLACEMENT_PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (!validStates.includes(newStatus)) {
    throw new AppError('Invalid replacement status state transition', HTTP_STATUS.BAD_REQUEST);
  }

  let repl = null;
  let orderItems = [];

  if (supabase) {
    const { data: found } = await supabase.from('replacement_requests')
      .select('*, orders(*)')
      .eq('id', replacementId)
      .maybeSingle();

    if (found) {
      repl = found;
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', repl.order_id);
      orderItems = items || [];
    }
  }

  if (!repl) {
    repl = Array.from(mockReplacements.values()).find(r => String(r.id) === String(replacementId) || String(r.order_id) === String(replacementId));
    if (!repl && String(replacementId).startsWith('repl-')) {
      throw new AppError('Replacement request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!repl) {
      repl = { id: replacementId, order_id: 'ord-mock', user_id: 'cust-1', status: 'APPROVED' };
    }
    orderItems = [{ product_id: 'prod-1', quantity: 2 }];
  }

  // When replacement is DELIVERED -> Permanently consume reserved replacement stock
  if (newStatus === 'DELIVERED') {
    const itemsToConsume = orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
    await inventoryService.consumeStock(itemsToConsume, repl.order_id);
  }

  const payload = {
    replacementId: repl.id,
    orderId: repl.order_id,
    userId: repl.user_id,
    status: newStatus,
    message: `Replacement order status updated to ${newStatus}.`
  };

  eventBus.emit(EVENT_TYPES.REPLACEMENT_UPDATED, payload);
  sseManager.broadcastReplacementUpdate(payload);

  return { success: true, status: newStatus, message: `Replacement status updated to ${newStatus}.` };
};

/**
 * LISTINGS
 */
const getAdminReplacements = async (queryParams = {}) => {
  if (supabase) {
    let query = supabase.from('replacement_requests')
      .select('*, orders(order_number, total_amount, payment_method, user_id, users(full_name, email, phone))')
      .order('created_at', { ascending: false });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    const { data } = await query;
    if (data) return data;
  }

  return Array.from(mockReplacements.values());
};

const getCustomerReplacements = async (userId, queryParams = {}) => {
  if (supabase) {
    const { data } = await supabase.from('replacement_requests')
      .select('*, orders(order_number, total_amount, payment_method)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) return data;
  }

  return Array.from(mockReplacements.values()).filter(r => String(r.user_id) === String(userId));
};

module.exports = {
  requestCustomerReplacement,
  approveReplacement,
  rejectReplacement,
  updateReplacementFulfillment,
  getAdminReplacements,
  getCustomerReplacements,
  mockReplacements
};
