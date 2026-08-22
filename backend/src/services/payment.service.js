const supabase = require('../config/supabase');
const razorpayService = require('./razorpay.service');
const { ORDER_STATUS, PAYMENT_STATUS, validateOrderStatusTransition } = require('./orderStatus.service');
const cartService = require('./cart.service');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');

const mockPaymentRecords = {};

const inventoryService = require('./inventory.service');

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

    // 3. IDEMPOTENCY CHECK: If already confirmed & paid, update payment record and return safe response
    if (order.status === ORDER_STATUS.CONFIRMED || order.status === ORDER_STATUS.PROCESSING) {
      await supabase.from('payments').update({
        razorpay_payment_id: razorpayPaymentId,
        provider_payment_id: razorpayPaymentId,
        status: PAYMENT_STATUS.PAID,
        payment_status: PAYMENT_STATUS.PAID,
        paid_at: nowIso,
        payment_verified_at: nowIso
      }).or(`order_id.eq.${order.id},razorpay_order_id.eq.${razorpayOrderId || ''}`);

      await supabase.from('orders').update({
        razorpay_payment_id: razorpayPaymentId
      }).eq('id', order.id);

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        paymentStatus: PAYMENT_STATUS.PAID,
        message: 'Payment already verified and order confirmed.'
      };
    }

    validateOrderStatusTransition(order.status, ORDER_STATUS.CONFIRMED);

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

    // 5. Update Order Status & Store Verified Payment ID
    await supabase.from('orders').update({
      status: ORDER_STATUS.CONFIRMED,
      razorpay_payment_id: razorpayPaymentId
    }).eq('id', order.id);

    // 6. Clear User Cart Idempotently
    await cartService.clearCart(userId);

    await logAdminActivity(userId, 'PAYMENT_VERIFIED', 'order', order.id, { orderNumber: order.order_number, razorpayPaymentId }, req);

    // 7. Emit Order Confirmed Event for Notification & WhatsApp Dispatch
    eventBus.emit(EVENT_TYPES.ORDER_CONFIRMED, {
      userId,
      orderId: order.id,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      customerName: order.users?.full_name || 'Customer',
      customerPhone: order.users?.phone || ''
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: ORDER_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PAID,
      message: 'Payment verified and order confirmed successfully 🎉'
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
    status: ORDER_STATUS.CONFIRMED,
    paymentStatus: PAYMENT_STATUS.PAID,
    message: 'Payment verified and order confirmed successfully 🎉'
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

module.exports = {
  verifyPayment,
  handlePaymentFailure
};
