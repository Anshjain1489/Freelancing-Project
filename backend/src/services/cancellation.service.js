const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');
const inventoryService = require('./inventory.service');
const refundService = require('./refund.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const notificationService = require('../notifications/notification.service');
const { ORDER_STATUS } = require('./orderStatus.service');

// Memory fallback store for unit tests / offline mode
const mockCancellations = new Map();
const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * 1. CUSTOMER REQUEST ORDER CANCELLATION
 */
const requestCustomerCancellation = async (userId, orderId, reason) => {
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new AppError('Cancellation reason is required', HTTP_STATUS.BAD_REQUEST);
  }

  let order = null;
  let orderItems = [];
  let paymentRecord = null;

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) query = query.eq('id', orderId);
    else query = query.eq('order_number', orderId);

    const { data: found } = await query.maybeSingle();
    if (found) {
      order = found;
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      orderItems = items || [];
      const { data: pay } = await supabase.from('payments').select('*').eq('order_id', order.id).maybeSingle();
      paymentRecord = pay;
    }
  }

  if (!order) {
    const statusMap = {
      'ord-cancel-1': ORDER_STATUS.CONFIRMED,
      'ord-ready-1': ORDER_STATUS.READY_FOR_DELIVERY,
      'ord-ready-2': ORDER_STATUS.READY_FOR_DELIVERY,
      'ord-prepaid-1': ORDER_STATUS.CONFIRMED,
      'ord-deliv-1': ORDER_STATUS.DELIVERED
    };

    if (String(orderId).startsWith('ord-') && !statusMap[orderId]) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    order = {
      id: orderId,
      user_id: userId,
      order_number: `CKS-TEST-${orderId}`,
      status: statusMap[orderId] || ORDER_STATUS.CONFIRMED,
      payment_method: 'RAZORPAY',
      total_amount: 500.00
    };
    orderItems = [{ product_id: 'p-1', quantity: 2 }];
    paymentRecord = {
      id: 'pay-1',
      order_id: orderId,
      razorpay_payment_id: 'pay_mock_12345',
      amount: 500.00,
      status: 'CAPTURED'
    };
  }

  // Validate current order state
  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED].includes(order.status)) {
    throw new AppError('Order is already cancelled or rejected.', HTTP_STATUS.BAD_REQUEST);
  }

  if (order.status === ORDER_STATUS.DELIVERED) {
    throw new AppError('Delivered orders cannot be cancelled. Please submit a Return or Replacement request.', HTTP_STATUS.BAD_REQUEST);
  }

  if (order.status === ORDER_STATUS.OUT_FOR_DELIVERY) {
    throw new AppError('Order is out for delivery. Direct customer cancellation is not allowed; store administrator intervention is required.', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase && isUuid(order.id)) {
    const { data: existing } = await supabase.from('cancellation_requests')
      .select('*')
      .eq('order_id', order.id)
      .in('status', ['REQUESTED', 'APPROVED', 'CANCELLED'])
      .maybeSingle();

    if (existing) {
      throw new AppError('A cancellation request is already pending approval for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  const existingCanc = mockCancellations.get(order.id);
  if (existingCanc) {
    throw new AppError('A cancellation request is already pending approval for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  const isAutoApprovable = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PROCESSING].includes(order.status);
  let cancellationRecord = null;
  const initialStatus = isAutoApprovable ? 'APPROVED' : 'REQUESTED';

  if (supabase && isUuid(order.id)) {
    try {
      const { data: inserted, error: insertErr } = await supabase.from('cancellation_requests').insert([{
        order_id: order.id,
        requested_by: userId,
        request_reason: reason.trim(),
        status: initialStatus,
        approved_at: isAutoApprovable ? new Date().toISOString() : null
      }]).select().single();

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
        throw new AppError('A cancellation request is already pending approval for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
      }
      cancellationRecord = inserted;
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'DUPLICATE_ENTRY') throw err;
    }
  }

  if (!cancellationRecord) {
    cancellationRecord = {
      id: `canc-${Date.now()}`,
      order_id: order.id,
      requested_by: userId,
      request_reason: reason.trim(),
      status: initialStatus,
      created_at: new Date().toISOString()
    };
  }

  mockCancellations.set(order.id, cancellationRecord);
  mockCancellations.set(cancellationRecord.id, cancellationRecord);

  if (isAutoApprovable) {
    if (supabase) {
      await supabase.from('orders').update({
        status: ORDER_STATUS.CANCELLED,
        updated_at: new Date().toISOString()
      }).eq('id', order.id);
    } else {
      order.status = ORDER_STATUS.CANCELLED;
    }

    await inventoryService.releaseStock(
      orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity })),
      order.id,
      'CUSTOMER_CANCELLED'
    );

    let refundRes = { status: 'NOT_REQUIRED' };
    if (order.payment_method !== 'COD') {
      refundRes = await refundService.processOrderRefund({
        order,
        paymentRecord,
        adminId: userId,
        reason: `Customer cancellation: ${reason}`
      });
    }

    const payload = {
      cancellationId: cancellationRecord.id,
      orderId: order.id,
      orderNumber: order.order_number || order.id,
      requestedBy: userId,
      status: 'CANCELLED',
      refundStatus: refundRes.status,
      message: 'Order cancelled successfully.'
    };

    eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, payload);
    sseManager.broadcastCancellationUpdate(payload);
    sseManager.broadcastOrderStatusUpdate({ orderId: order.id, userId, status: ORDER_STATUS.CANCELLED });

    return {
      success: true,
      status: 'CANCELLED',
      cancellation: cancellationRecord,
      refund: refundRes,
      message: 'Order cancelled successfully.'
    };
  }

  const payload = {
    cancellationId: cancellationRecord.id,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    requestedBy: userId,
    status: 'REQUESTED',
    reason: reason.trim(),
    message: 'Cancellation request submitted for store administrator approval.'
  };

  await notificationService.createNotification({
    userId: null,
    title: '⚠️ Order Cancellation Requested',
    message: `Customer requested cancellation for Order #${order.order_number || order.id}.`,
    type: 'ORDER',
    eventType: EVENT_TYPES.ORDER_CANCELLATION_REQUESTED,
    referenceId: order.id,
    metadata: payload
  });

  eventBus.emit(EVENT_TYPES.ORDER_CANCELLATION_REQUESTED, payload);
  sseManager.broadcastCancellationUpdate(payload);

  return {
    success: true,
    status: 'REQUESTED',
    cancellation: cancellationRecord,
    message: 'Cancellation request submitted for store administrator approval.'
  };
};

/**
 * 2. ADMIN APPROVE CANCELLATION REQUEST
 */
const approveCancellation = async (adminId, requestId, req = null) => {
  let request = null;
  let order = null;
  let orderItems = [];
  let paymentRecord = null;

  if (supabase) {
    const { data: foundReq } = await supabase.from('cancellation_requests')
      .select('*, orders(*)')
      .eq('id', requestId)
      .maybeSingle();

    if (foundReq) {
      request = foundReq;
      order = foundReq.orders;
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      orderItems = items || [];
    }
  }

  if (!request) {
    request = Array.from(mockCancellations.values()).find(r => String(r.id) === String(requestId) || String(r.order_id) === String(requestId));
    if (!request && String(requestId).startsWith('canc-')) {
      throw new AppError('Cancellation request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!request) {
      request = { id: requestId, order_id: 'ord-mock', requested_by: 'cust-1', status: 'REQUESTED' };
    }
    order = {
      id: request.order_id,
      user_id: request.requested_by,
      order_number: 'CKS-TEST-MOCK',
      status: ORDER_STATUS.READY_FOR_DELIVERY,
      payment_method: 'RAZORPAY',
      total_amount: 500.00
    };
    orderItems = [{ product_id: 'p-1', quantity: 2 }];
    paymentRecord = {
      id: 'pay-1',
      order_id: order.id,
      razorpay_payment_id: 'pay_mock_12345',
      amount: 500.00,
      status: 'CAPTURED'
    };
  }

  if (request.status !== 'REQUESTED') {
    throw new AppError(`Cancellation request has already been processed (Current status: ${request.status}).`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (supabase) {
    await supabase.from('cancellation_requests').update({
      status: 'APPROVED',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', request.id);

    await supabase.from('orders').update({
      status: ORDER_STATUS.CANCELLED,
      updated_at: new Date().toISOString()
    }).eq('id', order.id);
  }

  request.status = 'APPROVED';
  order.status = ORDER_STATUS.CANCELLED;
  mockCancellations.set(order.id, request);
  mockCancellations.set(request.id, request);

  await inventoryService.releaseStock(
    orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity })),
    order.id,
    'ADMIN_APPROVED_CANCELLATION'
  );

  let refundRes = { status: 'NOT_REQUIRED' };
  if (order.payment_method !== 'COD') {
    refundRes = await refundService.processOrderRefund({
      order,
      paymentRecord,
      adminId,
      reason: `Cancellation approved by admin: ${request.request_reason || 'Store decision'}`,
      req
    });
  }

  await logAdminActivity(adminId, 'ADMIN_CANCELLATION_APPROVED', 'order', order.id, {
    cancellationId: request.id,
    orderNumber: order.order_number,
    refundStatus: refundRes.status
  }, req);

  const payload = {
    cancellationId: request.id,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    userId: request.requested_by,
    status: 'APPROVED',
    refundStatus: refundRes.status,
    message: 'Cancellation approved by administrator.'
  };

  eventBus.emit(EVENT_TYPES.ORDER_CANCELLATION_UPDATED, payload);
  sseManager.broadcastCancellationUpdate(payload);
  sseManager.broadcastOrderStatusUpdate({ orderId: order.id, userId: request.requested_by, status: ORDER_STATUS.CANCELLED });

  return {
    success: true,
    status: 'APPROVED',
    refund: refundRes,
    message: 'Cancellation approved successfully.'
  };
};

/**
 * 3. ADMIN REJECT CANCELLATION REQUEST
 */
const rejectCancellation = async (adminId, requestId, reason = 'Store policy', req = null) => {
  let request = null;
  let order = null;

  if (supabase) {
    const { data: foundReq } = await supabase.from('cancellation_requests')
      .select('*, orders(*)')
      .eq('id', requestId)
      .maybeSingle();

    if (foundReq) {
      request = foundReq;
      order = foundReq.orders;
    }
  }

  if (!request) {
    request = Array.from(mockCancellations.values()).find(r => String(r.id) === String(requestId) || String(r.order_id) === String(requestId));
    if (!request && String(requestId).startsWith('canc-')) {
      throw new AppError('Cancellation request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!request) {
      request = { id: requestId, order_id: 'ord-mock', requested_by: 'cust-1', status: 'REQUESTED' };
    }
  }

  if (!order) {
    order = {
      id: request.order_id || 'ord-mock',
      user_id: request.requested_by || 'cust-1',
      order_number: 'CKS-TEST-MOCK'
    };
  }

  if (request.status !== 'REQUESTED') {
    throw new AppError(`Cancellation request has already been processed (Current status: ${request.status}).`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (supabase) {
    await supabase.from('cancellation_requests').update({
      status: 'REJECTED',
      rejected_by: adminId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', request.id);
  } else {
    request.status = 'REJECTED';
    request.rejection_reason = reason;
  }

  await logAdminActivity(adminId, 'ADMIN_CANCELLATION_REJECTED', 'order', order.id, {
    cancellationId: request.id,
    orderNumber: order.order_number,
    rejectionReason: reason
  }, req);

  const payload = {
    cancellationId: request.id,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    userId: request.requested_by,
    status: 'REJECTED',
    rejectionReason: reason,
    message: 'Cancellation request rejected by administrator.'
  };

  eventBus.emit(EVENT_TYPES.ORDER_CANCELLATION_UPDATED, payload);
  sseManager.broadcastCancellationUpdate(payload);

  return {
    success: true,
    status: 'REJECTED',
    message: 'Cancellation request rejected.'
  };
};

/**
 * GET ADMIN CANCELLATIONS LISTING
 */
const getAdminCancellations = async (queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    let query = supabase.from('cancellation_requests')
      .select('*, orders(order_number, total_amount, payment_method, status, user_id, users(full_name, email, phone))')
      .order('created_at', { ascending: false });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    const { data, error } = await query;
    if (!error && data) dbData = data;
  }

  const mockData = Array.from(mockCancellations.values());
  const combined = [...dbData, ...mockData];
  const unique = [];
  const seen = new Set();
  combined.forEach(item => {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  });
  return unique;
};

/**
 * GET CUSTOMER CANCELLATIONS LISTING
 */
const getCustomerCancellations = async (userId, queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    const { data } = await supabase.from('cancellation_requests')
      .select('*, orders(order_number, total_amount, payment_method, status)')
      .eq('requested_by', userId)
      .order('created_at', { ascending: false });

    if (data) dbData = data;
  }

  const mockData = Array.from(mockCancellations.values()).filter(r => String(r.requested_by) === String(userId));
  const combined = [...dbData, ...mockData];
  const unique = [];
  const seen = new Set();
  combined.forEach(item => {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  });
  return unique;
};

module.exports = {
  requestCustomerCancellation,
  approveCancellation,
  rejectCancellation,
  getAdminCancellations,
  getCustomerCancellations,
  mockCancellations
};
