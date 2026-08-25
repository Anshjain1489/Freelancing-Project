const supabase = require('../config/supabase');
const razorpayService = require('./razorpay.service');
const { ORDER_STATUS, PAYMENT_STATUS, validateOrderStatusTransition } = require('./orderStatus.service');
const cartService = require('./cart.service');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const config = require('../config/environment');

const mockPaymentRecords = {};

const inventoryService = require('./inventory.service');
const orderTrackingService = require('./orderTracking.service');

const verifyPayment = async (userId, { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature }, req = null) => {
  if (!razorpayPaymentId) {
    throw new AppError('Verified Razorpay payment ID is required for payment verification', HTTP_STATUS.BAD_REQUEST);
  }

  // 1. Verify Razorpay HMAC Signature (Skip signature calculation only for internal webhook triggers)
  if (razorpaySignature !== 'webhook_verified') {
    const isValidSignature = razorpayService.verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValidSignature) {
      throw new AppError('Invalid payment signature. Verification failed.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }
  }

  if (supabase) {
    // 2. Fetch Order & Payment Record
    const { data: order, error: orderErr } = await supabase.from('orders')
      .select('*, order_items (*), users ( full_name, phone )')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .eq('user_id', userId)
      .single();

    if (orderErr || !order) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    const nowIso = new Date().toISOString();

    // 3. IDEMPOTENCY CHECK: If already paid & processing, update payment record and return safe response
    if (order.payment_status === PAYMENT_STATUS.PAID && (order.status === ORDER_STATUS.PROCESSING || order.status === ORDER_STATUS.READY_FOR_DELIVERY || order.status === ORDER_STATUS.OUT_FOR_DELIVERY || order.status === ORDER_STATUS.DELIVERED)) {
      await supabase.from('payments').update({
        razorpay_payment_id: razorpayPaymentId,
        provider_payment_id: razorpayPaymentId,
        status: PAYMENT_STATUS.PAID,
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: nowIso,
        payment_verified_at: nowIso
      }).or(`order_id.eq.${order.id},razorpay_order_id.eq.${razorpayOrderId || ''}`);

      await supabase.from('orders').update({
        razorpay_payment_id: razorpayPaymentId,
        payment_status: PAYMENT_STATUS.PAID
      }).eq('id', order.id);

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: PAYMENT_STATUS.PAID,
        message: 'Payment already verified and order is processing.'
      };
    }

    validateOrderStatusTransition(order.status, ORDER_STATUS.PROCESSING);

    // 4. Update Payment Record Across All Gateway Columns
    let { data: updatedPay } = await supabase.from('payments').update({
      razorpay_payment_id: razorpayPaymentId,
      provider_payment_id: razorpayPaymentId,
      status: PAYMENT_STATUS.PAID,
      payment_status: PAYMENT_STATUS.PAID,
      paid_at: nowIso,
      payment_verified_at: nowIso
    }).eq('order_id', order.id).select();

    if (!updatedPay || updatedPay.length === 0) {
      if (razorpayOrderId) {
        await supabase.from('payments').update({
          razorpay_payment_id: razorpayPaymentId,
          provider_payment_id: razorpayPaymentId,
          status: PAYMENT_STATUS.PAID,
          payment_status: PAYMENT_STATUS.PAID,
          paid_at: nowIso,
          payment_verified_at: nowIso
        }).eq('razorpay_order_id', razorpayOrderId);
      }
    }

    // 5. Update Order Status to PROCESSING & payment_status to PAID
    await supabase.from('orders').update({
      status: ORDER_STATUS.PROCESSING,
      payment_status: PAYMENT_STATUS.PAID,
      razorpay_payment_id: razorpayPaymentId,
      updated_at: nowIso
    }).eq('id', order.id);

    // 6. Clear User Cart Idempotently
    await cartService.clearCart(userId);

    await logAdminActivity(userId, 'PAYMENT_VERIFIED', 'order', order.id, { orderNumber: order.order_number, razorpayPaymentId }, req);

    // 7. Emit Order Confirmed & Payment Successful Events for Notification, SSE & WhatsApp Dispatch
    const payload = {
      userId,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      customerName: order.users?.full_name || 'Customer',
      customerPhone: order.users?.phone || '',
      status: ORDER_STATUS.PROCESSING,
      paymentStatus: PAYMENT_STATUS.PAID
    };

    eventBus.emit(EVENT_TYPES.ORDER_CONFIRMED, payload);
    eventBus.emit('PAYMENT_SUCCESSFUL', payload);
    sseManager.broadcastOrderStatusUpdate({
      type: EVENT_TYPES.ORDER_STATUS_UPDATED,
      orderId: order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      previousStatus: order.status,
      newStatus: ORDER_STATUS.PROCESSING,
      paymentStatus: PAYMENT_STATUS.PAID,
      updatedAt: nowIso
    });

    await orderTrackingService.recordStatusChange({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: ORDER_STATUS.PROCESSING,
      changedBy: userId,
      changedByRole: 'CUSTOMER',
      reason: 'Razorpay payment verified successfully',
      metadata: { eventType: 'PAYMENT_SUCCESSFUL', razorpayPaymentId }
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: ORDER_STATUS.PROCESSING,
      paymentStatus: PAYMENT_STATUS.PAID,
      message: 'Payment verified and order is now being processed 🎉'
    };
  }

  // Local Mock Fallback
  const recordKey = `${userId}_${orderId}`;
  mockPaymentRecords[recordKey] = {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    status: PAYMENT_STATUS.PAID,
    verifiedAt: new Date().toISOString()
  };

  await cartService.clearCart(userId);

  const mockOrderNumber = `CKS-${Date.now().toString().slice(-6)}`;
  eventBus.emit(EVENT_TYPES.ORDER_CONFIRMED, {
    userId,
    orderId,
    orderNumber: mockOrderNumber,
    totalAmount: 480,
    customerName: 'Akash Customer',
    customerPhone: '7897837095'
  });

  return {
    orderId,
    orderNumber: mockOrderNumber,
    status: ORDER_STATUS.PROCESSING,
    paymentStatus: PAYMENT_STATUS.PAID,
    message: 'Payment verified and order is now being processed 🎉'
  };
};

const handlePaymentFailure = async (userId, { orderId, razorpayOrderId, failureReason }) => {
  if (supabase) {
    await supabase.from('payments').update({
      status: PAYMENT_STATUS.FAILED,
      payment_status: PAYMENT_STATUS.FAILED,
      payment_failure_reason: failureReason || 'Payment rejected by user or gateway',
      failure_reason: failureReason || 'Payment rejected by user or gateway'
    }).eq('order_id', orderId);

    await supabase.from('orders').update({
      status: ORDER_STATUS.PAYMENT_FAILED
    }).eq('id', orderId);
  }

  // Release reserved stock on payment failure safely (idempotent)
  await inventoryService.releaseStock(null, orderId, 'PAYMENT_FAILED');

  return {
    orderId,
    status: ORDER_STATUS.PAYMENT_FAILED,
    paymentStatus: PAYMENT_STATUS.FAILED,
    message: 'Payment failed. You may retry payment from order details.'
  };
};

const createPaymentForOrder = async (userId, orderId) => {
  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    if (String(order.user_id) !== String(userId)) {
      throw new AppError('Forbidden: You are not authorized to process payment for this order', HTTP_STATUS.FORBIDDEN);
    }

    if (order.status === ORDER_STATUS.REJECTED) {
      throw new AppError('This order was rejected and cannot be paid.', HTTP_STATUS.CONFLICT);
    }

    if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
      if (order.status === ORDER_STATUS.CONFIRMED) {
        throw new AppError('Order is waiting for store confirmation before payment can be initialized.', HTTP_STATUS.BAD_REQUEST);
      }
      if (order.status === ORDER_STATUS.PROCESSING || order.status === ORDER_STATUS.READY_FOR_DELIVERY || order.status === ORDER_STATUS.OUT_FOR_DELIVERY || order.status === ORDER_STATUS.DELIVERED) {
        throw new AppError('Payment has already been completed or order is in processing state.', HTTP_STATUS.BAD_REQUEST);
      }
      throw new AppError(`Cannot create payment for order in state: ${order.status}`, HTTP_STATUS.BAD_REQUEST);
    }

    // Idempotency: Reuse existing pending Razorpay order if present
    const { data: existingPayments } = await supabase.from('payments')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false });

    const pendingPay = (existingPayments || []).find(p => p.razorpay_order_id && (p.status === PAYMENT_STATUS.PENDING || p.payment_status === PAYMENT_STATUS.PENDING));

    const amountInPaise = Math.round(parseFloat(order.total_amount) * 100);

    if (pendingPay && pendingPay.razorpay_order_id) {
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        razorpayOrderId: pendingPay.razorpay_order_id,
        amountInPaise,
        totalPayableAmount: parseFloat(order.total_amount),
        currency: 'INR',
        keyId: config.razorpay?.keyId || 'mock_key'
      };
    }

    // Create new Razorpay order
    const razorpayOrder = await razorpayService.createRazorpayOrder(amountInPaise, 'INR', order.order_number);

    await supabase.from('payments').insert([{
      order_id: order.id,
      payment_method: 'RAZORPAY',
      provider: 'RAZORPAY',
      status: PAYMENT_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.PENDING,
      razorpay_order_id: razorpayOrder.id,
      provider_order_id: razorpayOrder.id,
      amount: parseFloat(order.total_amount),
      currency: 'INR'
    }]);

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      razorpayOrderId: razorpayOrder.id,
      amountInPaise,
      totalPayableAmount: parseFloat(order.total_amount),
      currency: razorpayOrder.currency || 'INR',
      keyId: config.razorpay?.keyId || 'mock_key'
    };
  }

  // Mock Fallback
  const amountInPaise = 50000;
  return {
    orderId,
    orderNumber: `CKS-${orderId}`,
    razorpayOrderId: `rzp_order_mock_${Date.now()}`,
    amountInPaise,
    totalPayableAmount: 500,
    currency: 'INR',
    keyId: config.razorpay?.keyId || 'mock_key'
  };
};

module.exports = {
  verifyPayment,
  handlePaymentFailure,
  createPaymentForOrder
};
