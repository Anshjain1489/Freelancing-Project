const supabase = require('../../config/supabase');
const { ORDER_STATUS, validateOrderStatusTransition } = require('../orderStatus.service');
const { logAdminActivity } = require('../adminLog.service');
const refundService = require('../refund.service');
const eventBus = require('../../events/eventBus');
const EVENT_TYPES = require('../../events/eventTypes');
const sseManager = require('../../notifications/sse.manager');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');
const orderTrackingService = require('../orderTracking.service');

// Mock list fallback
const mockList = [
  { id: 'ord-1', orderNumber: 'CKS-20260821-0001', customerName: 'Rahul Sharma', customerPhone: '9876543210', status: 'CONFIRMED', paymentStatus: 'PAID', totalAmount: 650, itemCount: 3, createdAt: new Date().toISOString() },
  { id: 'ord-2', orderNumber: 'CKS-20260821-0002', customerName: 'Priya Gupta', customerPhone: '9123456789', status: 'OUT_FOR_DELIVERY', paymentStatus: 'PAID', totalAmount: 1120, itemCount: 5, createdAt: new Date().toISOString() }
];

const getActivePayment = (payments) => {
  const payList = Array.isArray(payments) ? payments : (payments ? [payments] : []);
  return payList.find(p => p.status === 'PAID' || p.payment_status === 'PAID') || payList[0] || {};
};

const getAdminOrders = async (queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    let query = supabase.from('orders')
      .select('*, order_items (*), users ( full_name, phone ), payments ( status, payment_status, razorpay_payment_id, provider_payment_id )', { count: 'exact' });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }
    if (queryParams.search) {
      query = query.or(`order_number.ilike.%${queryParams.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch admin orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = data.map(o => {
      const activePay = getActivePayment(o.payments);
      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.users?.full_name || 'Customer',
        customerPhone: o.users?.phone || '',
        status: o.status,
        paymentStatus: activePay.status || activePay.payment_status || 'PAID',
        subtotal: parseFloat(o.subtotal),
        deliveryCharge: parseFloat(o.delivery_charge),
        couponCode: o.coupon_code,
        discountAmount: parseFloat(o.discount_amount || 0),
        totalPayableAmount: parseFloat(o.total_amount),
        totalAmount: parseFloat(o.total_amount),
        itemCount: o.order_items?.length || 0,
        acceptedBy: o.accepted_by,
        acceptedAt: o.accepted_at,
        rejectedBy: o.rejected_by,
        rejectedAt: o.rejected_at,
        rejectionReason: o.rejection_reason,
        createdAt: o.created_at
      };
    });

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  return formatPaginatedResponse(mockList, page, limit, mockList.length);
};

const getUnresolvedOrders = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('orders')
      .select('*, order_items (*), users ( full_name, phone ), payments ( status, payment_status )')
      .eq('status', ORDER_STATUS.CONFIRMED)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(o => {
      const activePay = getActivePayment(o.payments);
      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.users?.full_name || 'Customer',
        customerPhone: o.users?.phone || '',
        status: o.status,
        paymentStatus: activePay.status || activePay.payment_status || 'PAID',
        subtotal: parseFloat(o.subtotal),
        deliveryCharge: parseFloat(o.delivery_charge),
        couponCode: o.coupon_code,
        discountAmount: parseFloat(o.discount_amount || 0),
        totalPayableAmount: parseFloat(o.total_amount),
        totalAmount: parseFloat(o.total_amount),
        itemCount: o.order_items?.length || 0,
        createdAt: o.created_at
      };
    });
  }

  return mockList.filter(o => o.status === 'CONFIRMED');
};

const acceptOrder = async (adminId, orderId, req = null) => {
  if (supabase) {
    const { data: existing } = await supabase.from('orders')
      .select('*, users ( full_name, phone )')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (!existing) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    if (existing.status !== ORDER_STATUS.CONFIRMED) {
      throw new AppError('This order has already been processed by another administrator.', HTTP_STATUS.CONFLICT);
    }

    const isCod = String(existing.payment_method || '').toUpperCase() === 'COD';
    const isPaid = existing.payment_status === 'PAID';
    const targetStatus = (isCod || isPaid) ? ORDER_STATUS.PROCESSING : ORDER_STATUS.PENDING_PAYMENT;

    // Atomic Database Update: WHERE status = 'CONFIRMED'
    let { data: updated, error } = await supabase.from('orders')
      .update({
        status: targetStatus,
        accepted_by: adminId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .eq('status', ORDER_STATUS.CONFIRMED)
      .select('*')
      .maybeSingle();

    if (error && error.message?.includes('schema cache')) {
      const fallbackRes = await supabase.from('orders')
        .update({
          status: targetStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('status', ORDER_STATUS.CONFIRMED)
        .select('*')
        .maybeSingle();
      updated = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !updated) {
      throw new AppError('This order has already been processed by another administrator.', HTTP_STATUS.CONFLICT);
    }

    await logAdminActivity(adminId, 'ADMIN_ORDER_ACCEPTED', 'order', existing.id, {
      orderNumber: existing.order_number,
      previousStatus: existing.status,
      newStatus: targetStatus
    }, req);

    const message = targetStatus === ORDER_STATUS.PENDING_PAYMENT
      ? 'Your order has been accepted! Please complete payment.'
      : 'Your order has been accepted and is being processed.';

    eventBus.emit(EVENT_TYPES.ORDER_ACCEPTED, {
      adminId,
      userId: existing.user_id,
      orderId: existing.id,
      orderNumber: existing.order_number,
      customerName: existing.users?.full_name,
      customerPhone: existing.users?.phone,
      totalAmount: existing.total_amount,
      status: targetStatus,
      message
    });

    sseManager.broadcastDecision({
      orderId: existing.id,
      orderNumber: existing.order_number,
      previousStatus: existing.status,
      status: targetStatus,
      action: 'ACCEPTED',
      processedBy: adminId,
      message
    });

    await orderTrackingService.recordStatusChange({
      orderId: existing.id,
      previousStatus: existing.status,
      newStatus: targetStatus,
      changedBy: adminId,
      changedByRole: 'ADMIN',
      reason: message,
      metadata: { eventType: 'ORDER_ACCEPTED', paymentMethod: existing.payment_method }
    });

    return {
      orderId: existing.id,
      orderNumber: existing.order_number,
      status: targetStatus,
      message: 'Order accepted successfully 🎉'
    };
  }

  const mockOrder = mockList.find(o => o.id === orderId || o.orderNumber === orderId);
  if (mockOrder) {
    if (mockOrder.status !== 'CONFIRMED') {
      throw new AppError('This order has already been processed by another administrator.', HTTP_STATUS.CONFLICT);
    }
    const isCod = String(mockOrder.paymentMethod || mockOrder.payment_method || '').toUpperCase() === 'COD';
    const isPaid = mockOrder.paymentStatus === 'PAID' || mockOrder.payment_status === 'PAID';
    mockOrder.status = (isCod || isPaid) ? ORDER_STATUS.PROCESSING : ORDER_STATUS.PENDING_PAYMENT;
  }

  const mockTarget = mockOrder ? mockOrder.status : ORDER_STATUS.PROCESSING;
  eventBus.emit(EVENT_TYPES.ORDER_ACCEPTED, { adminId, orderId, orderNumber: orderId, status: mockTarget });
  sseManager.broadcastDecision({ orderId, status: mockTarget, action: 'ACCEPTED', processedBy: adminId });

  return { orderId, status: mockTarget, message: 'Order accepted successfully 🎉' };
};

const rejectOrder = async (adminId, orderId, { reason } = {}, req = null) => {
  const sanitizedReason = reason ? String(reason).trim().slice(0, 500) : 'Store temporarily unable to fulfill item request';

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*, payments ( * )');
    
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { data: existing } = await query.maybeSingle();

    if (!existing) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    const allowRejectionStates = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PENDING_PAYMENT];
    if (!allowRejectionStates.includes(existing.status)) {
      throw new AppError('This order has already been processed or cannot be rejected.', HTTP_STATUS.CONFLICT);
    }

    // Atomic Database Update
    let { data: updated, error } = await supabase.from('orders')
      .update({
        status: ORDER_STATUS.REJECTED,
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: sanitizedReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .in('status', allowRejectionStates)
      .select('*')
      .maybeSingle();

    if (error && error.message?.includes('schema cache')) {
      const fallbackRes = await supabase.from('orders')
        .update({
          status: ORDER_STATUS.REJECTED,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .in('status', allowRejectionStates)
        .select('*')
        .maybeSingle();
      updated = fallbackRes.data;
      error = fallbackRes.error;
    }

    const inventoryService = require('../inventory.service');

    if (error || !updated) {
      throw new AppError('This order has already been processed by another administrator.', HTTP_STATUS.CONFLICT);
    }

    // Release stock reservation immediately & atomically upon rejection
    await inventoryService.releaseStock(null, existing.id, sanitizedReason);

    await orderTrackingService.recordStatusChange({
      orderId: existing.id,
      previousStatus: existing.status,
      newStatus: ORDER_STATUS.REJECTED,
      changedBy: adminId,
      changedByRole: 'ADMIN',
      reason: sanitizedReason,
      metadata: { eventType: 'ORDER_REJECTED' }
    });

    // Fetch verified payment record
    const { data: payRecords } = await supabase.from('payments')
      .select('*')
      .eq('order_id', existing.id)
      .order('created_at', { ascending: false });

    const paidRecord = payRecords ? payRecords.find(p => (p.status === 'PAID' || p.payment_status === 'PAID') && (p.razorpay_payment_id || p.provider_payment_id)) : null;

    // Phase 21 Rule: If order was unpaid (payment_status !== PAID and no paid payment record exists), DO NOT trigger Razorpay refund API
    if (existing.payment_status !== 'PAID' && !paidRecord) {
      eventBus.emit(EVENT_TYPES.ORDER_REJECTED, { adminId, orderId: existing.id, orderNumber: existing.order_number, rejectionReason: sanitizedReason });
      sseManager.broadcastDecision({ orderId: existing.id, status: ORDER_STATUS.REJECTED, action: 'REJECTED', processedBy: adminId });

      return {
        orderId: existing.id,
        orderNumber: existing.order_number,
        status: ORDER_STATUS.REJECTED,
        paymentStatus: existing.payment_status || 'PENDING',
        refundStatus: 'NOT_APPLICABLE',
        rejectionReason: sanitizedReason,
        message: 'Order rejected successfully. No refund needed for unpaid order.'
      };
    }

    // Paid Order: Trigger Crash-Safe Automated Refund Process
    const refundResult = await refundService.processOrderRefund({
      order: updated,
      paymentRecord: paidRecord || payRecords?.[0],
      adminId,
      reason: sanitizedReason,
      req
    });

    return {
      orderId: existing.id,
      orderNumber: existing.order_number,
      status: ORDER_STATUS.REJECTED,
      paymentStatus: paidRecord?.status || paidRecord?.payment_status || 'PAID',
      refundStatus: refundResult.status,
      refundAmount: refundResult.amount,
      razorpayRefundId: refundResult.refundId,
      rejectionReason: sanitizedReason,
      message: refundResult.message
    };
  }

  const mockOrder = mockList.find(o => o.id === orderId || o.orderNumber === orderId);
  if (mockOrder) {
    const allowRejectionStates = ['CONFIRMED', 'PENDING_PAYMENT'];
    if (!allowRejectionStates.includes(mockOrder.status)) {
      throw new AppError('This order has already been processed by another administrator.', HTTP_STATUS.CONFLICT);
    }
    mockOrder.status = ORDER_STATUS.REJECTED;
  }

  const inventoryService = require('../inventory.service');
  await inventoryService.releaseStock(null, orderId, sanitizedReason);

  eventBus.emit(EVENT_TYPES.ORDER_REJECTED, { adminId, orderId, orderNumber: orderId, rejectionReason: sanitizedReason });
  sseManager.broadcastDecision({ orderId, status: ORDER_STATUS.REJECTED, action: 'REJECTED', processedBy: adminId });

  return { orderId, status: ORDER_STATUS.REJECTED, rejectionReason: sanitizedReason, refundStatus: 'NOT_APPLICABLE', message: 'Order rejected' };
};

const updateOrderStatus = async (userId, orderId, { status }, req = null) => {
  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*, users ( full_name, phone )');
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { data: order } = await query.maybeSingle();

    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    validateOrderStatusTransition(order.status, status);

    // Atomic Database Update: WHERE status = order.status (Concurrency Protection)
    const { data: updated, error } = await supabase.from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', order.status)
      .select()
      .maybeSingle();

    if (error || !updated) {
      throw new AppError('This order status has already been modified by another administrator.', HTTP_STATUS.CONFLICT);
    }

    const payload = {
      type: EVENT_TYPES.ORDER_STATUS_UPDATED,
      orderId: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      previousStatus: order.status,
      newStatus: status,
      updatedBy: { id: userId },
      updatedAt: new Date().toISOString(),
      metadata: { source: 'ADMIN_DASHBOARD' }
    };

    await logAdminActivity(userId, 'ORDER_STATUS_UPDATED', 'order', order.id, { oldStatus: order.status, newStatus: status }, req);

    eventBus.emit(EVENT_TYPES.ORDER_STATUS_UPDATED, payload);
    sseManager.broadcastOrderStatusUpdate(payload);

    if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
      eventBus.emit(EVENT_TYPES.ORDER_OUT_FOR_DELIVERY, {
        userId: order.user_id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.users?.full_name,
        customerPhone: order.users?.phone
      });
    } else if (status === ORDER_STATUS.DELIVERED) {
      eventBus.emit(EVENT_TYPES.ORDER_DELIVERED, {
        userId: order.user_id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.users?.full_name,
        customerPhone: order.users?.phone
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      previousStatus: order.status,
      newStatus: updated.status,
      message: `Order status updated to ${status}`
    };
  }

  const payload = {
    type: EVENT_TYPES.ORDER_STATUS_UPDATED,
    orderId,
    newStatus: status
  };
  eventBus.emit(EVENT_TYPES.ORDER_STATUS_UPDATED, payload);
  sseManager.broadcastOrderStatusUpdate(payload);

  return { orderId, status, message: `Order status updated to ${status}` };
};

const retryRefund = async (adminId, orderId, req = null) => {
  return refundService.retryFailedRefund(adminId, orderId, req);
};

module.exports = {
  getAdminOrders,
  getUnresolvedOrders,
  acceptOrder,
  rejectOrder,
  retryRefund,
  updateOrderStatus
};
