const supabase = require('../config/supabase');
const razorpayService = require('./razorpay.service');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const REFUND_STATUS = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  NOT_INITIATED: 'NOT_INITIATED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

const mockRefunds = {};

/**
 * Process automated full refund for a rejected order
 */
const processOrderRefund = async ({ order, paymentRecord, adminId, reason = 'Order rejected by store administrator', req = null }) => {
  const orderId = order.id;

  // 1. Check if Cash on Delivery (COD) order
  if (order.payment_method === 'COD' || paymentRecord?.payment_method === 'COD') {
    if (supabase) {
      await supabase.from('orders').update({ refund_status: REFUND_STATUS.NOT_REQUIRED }).eq('id', orderId);
    }
    return {
      status: REFUND_STATUS.NOT_REQUIRED,
      message: 'COD order does not require online refund'
    };
  }

  // 2. Strict Idempotency Check: Query existing refund record
  if (supabase) {
    try {
      const { data: existingRefund } = await supabase.from('refunds')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingRefund) {
        if ([REFUND_STATUS.PROCESSING, REFUND_STATUS.COMPLETED].includes(existingRefund.status)) {
          return {
            status: existingRefund.status,
            refundId: existingRefund.razorpay_refund_id,
            amount: parseFloat(existingRefund.amount),
            message: `Refund already ${existingRefund.status.toLowerCase()}`
          };
        }
      }
    } catch {}
  }

  if (mockRefunds[orderId]) {
    const m = mockRefunds[orderId];
    if ([REFUND_STATUS.PROCESSING, REFUND_STATUS.COMPLETED].includes(m.status)) {
      return {
        status: m.status,
        refundId: m.razorpayRefundId,
        amount: m.amount,
        message: `Refund already ${m.status.toLowerCase()}`
      };
    }
  }

  // 3. Extract Verified Payment Details (Database Source of Truth)
  const razorpayPaymentId = paymentRecord?.razorpay_payment_id || paymentRecord?.provider_payment_id || order.razorpay_payment_id;
  const verifiedAmount = paymentRecord?.amount ? parseFloat(paymentRecord.amount) : parseFloat(order.total_amount);

  if (!razorpayPaymentId) {
    if (supabase) {
      try {
        await supabase.from('orders').update({ refund_status: REFUND_STATUS.FAILED }).eq('id', orderId);
      } catch {}
    }
    throw new AppError('Cannot process refund: Missing verified Razorpay payment ID record.', HTTP_STATUS.BAD_REQUEST);
  }

  const amountInPaise = Math.round(verifiedAmount * 100);

  // 4. Create Initial Refund Record (State: PROCESSING) - DB First Transaction Sequence
  let refundRecordId = null;
  if (supabase) {
    try {
      let requestedBy = adminId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(adminId));
      if (!isUuid) requestedBy = null;

      const { data: createdRefund, error: insertErr } = await supabase.from('refunds').insert([{
        order_id: orderId,
        payment_id: paymentRecord?.id || null,
        amount: verifiedAmount,
        currency: 'INR',
        status: REFUND_STATUS.PROCESSING,
        reason,
        requested_by: requestedBy,
        requested_at: new Date().toISOString()
      }]).select().maybeSingle();

      if (insertErr) console.log('Refund insert error:', insertErr);

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
        // Unique constraint violation: Order refund record already exists!
        const { data: existingRefund } = await supabase.from('refunds')
          .select('*')
          .eq('order_id', orderId)
          .maybeSingle();

        if (existingRefund && [REFUND_STATUS.PROCESSING, REFUND_STATUS.COMPLETED].includes(existingRefund.status)) {
          return {
            status: existingRefund.status,
            refundId: existingRefund.razorpay_refund_id,
            amount: parseFloat(existingRefund.amount),
            message: `Refund already ${existingRefund.status.toLowerCase()}`
          };
        }
      }

      if (createdRefund) refundRecordId = createdRefund.id;

      await supabase.from('orders').update({ refund_status: REFUND_STATUS.PROCESSING }).eq('id', orderId);
      if (paymentRecord?.id) {
        await supabase.from('payments').update({ refund_status: REFUND_STATUS.PROCESSING }).eq('id', paymentRecord.id);
      }
    } catch {}
  }

  // 5. Invoke External Gateway API (Only AFTER DB State Reservation)
  try {
    const razorpayRefund = await razorpayService.initiateRazorpayRefund(
      razorpayPaymentId,
      amountInPaise,
      { orderId, orderNumber: order.order_number, reason }
    );

    const rzpRefundId = razorpayRefund.id;
    const isInstantProcessed = razorpayRefund.status === 'processed';
    const finalRefundStatus = isInstantProcessed ? REFUND_STATUS.COMPLETED : REFUND_STATUS.PROCESSING;

    mockRefunds[orderId] = {
      orderId,
      razorpayRefundId: rzpRefundId,
      amount: verifiedAmount,
      status: finalRefundStatus
    };

    // 6. Update Refund Record with Razorpay Details
    if (supabase && refundRecordId) {
      try {
        await supabase.from('refunds').update({
          razorpay_refund_id: rzpRefundId,
          status: finalRefundStatus,
          completed_at: isInstantProcessed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }).eq('id', refundRecordId);

        await supabase.from('orders').update({ refund_status: finalRefundStatus }).eq('id', orderId);
        if (paymentRecord?.id) {
          await supabase.from('payments').update({
            refund_status: finalRefundStatus,
            payment_status: isInstantProcessed ? 'REFUNDED' : 'PAID'
          }).eq('id', paymentRecord.id);
        }
      } catch {}
    }

    // 7. Audit Log & Notifications
    await logAdminActivity(adminId, 'RAZORPAY_REFUND_INITIATED', 'order', orderId, {
      orderNumber: order.order_number,
      razorpayPaymentId,
      razorpayRefundId: rzpRefundId,
      refundAmount: verifiedAmount,
      refundStatus: finalRefundStatus
    }, req);

    eventBus.emit(EVENT_TYPES.REFUND_INITIATED, {
      userId: order.user_id,
      orderId,
      orderNumber: order.order_number,
      amount: verifiedAmount,
      razorpayRefundId: rzpRefundId,
      refundStatus: finalRefundStatus
    });

    sseManager.broadcastDecision({
      orderId,
      orderNumber: order.order_number,
      status: 'REJECTED',
      paymentStatus: isInstantProcessed ? 'REFUNDED' : 'PAID',
      refundStatus: finalRefundStatus,
      refundAmount: verifiedAmount,
      razorpayRefundId: rzpRefundId
    });

    return {
      status: finalRefundStatus,
      refundId: rzpRefundId,
      amount: verifiedAmount,
      message: `Full refund of ₹${verifiedAmount} initiated successfully 🎉`
    };
  } catch (err) {
    const errorMsg = err.message || 'Razorpay refund API call failed';
    const isAmbiguousTimeout = /timeout|etimedout|econnreset|502|504|network|socket/i.test(errorMsg);

    if (isAmbiguousTimeout) {
      // Ambiguous Failure Handling: Gateway call timed out or network disconnected.
      // Do NOT revert to FAILED or allow immediate duplicate refund. Mark PROCESSING for webhook reconciliation.
      const ambiguousMsg = `TIMED_OUT_AWAITING_RECONCILIATION: ${errorMsg}`;

      if (supabase) {
        if (refundRecordId) {
          await supabase.from('refunds').update({
            status: REFUND_STATUS.PROCESSING,
            failure_reason: ambiguousMsg,
            updated_at: new Date().toISOString()
          }).eq('id', refundRecordId);
        }
        await supabase.from('orders').update({ refund_status: REFUND_STATUS.PROCESSING }).eq('id', orderId);
      }

      await logAdminActivity(adminId, 'RAZORPAY_REFUND_INITIATED', 'order', orderId, {
        orderNumber: order.order_number,
        failureReason: ambiguousMsg,
        status: REFUND_STATUS.PROCESSING
      }, req);

      return {
        status: REFUND_STATUS.PROCESSING,
        amount: verifiedAmount,
        message: 'Refund submitted to payment gateway. Gateway response timed out; awaiting webhook reconciliation.'
      };
    }

    // Definitive Failure (e.g. invalid credentials or bad request): Mark FAILED
    if (supabase) {
      if (refundRecordId) {
        await supabase.from('refunds').update({
          status: REFUND_STATUS.FAILED,
          failure_reason: errorMsg,
          updated_at: new Date().toISOString()
        }).eq('id', refundRecordId);
      }
      await supabase.from('orders').update({ refund_status: REFUND_STATUS.FAILED }).eq('id', orderId);
      if (paymentRecord?.id) {
        await supabase.from('payments').update({ refund_status: REFUND_STATUS.FAILED }).eq('id', paymentRecord.id);
      }
    }

    await logAdminActivity(adminId, 'RAZORPAY_REFUND_FAILED', 'order', orderId, {
      orderNumber: order.order_number,
      failureReason: errorMsg
    }, req);

    eventBus.emit(EVENT_TYPES.REFUND_FAILED, {
      userId: order.user_id,
      orderId,
      orderNumber: order.order_number,
      failureReason: errorMsg
    });

    return {
      status: REFUND_STATUS.FAILED,
      amount: verifiedAmount,
      failureReason: errorMsg,
      message: 'Order rejected. Automatic refund could not be completed.'
    };
  }
};

/**
 * Authorized Retry for Failed Refunds
 */
const retryFailedRefund = async (adminId, orderId, req = null) => {
  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { data: order } = await query.maybeSingle();

    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    if (order.status !== 'REJECTED') {
      throw new AppError('Only rejected orders can have refund retried.', HTTP_STATUS.BAD_REQUEST);
    }

    if (order.refund_status === REFUND_STATUS.COMPLETED) {
      throw new AppError('Refund is already completed for this order.', HTTP_STATUS.BAD_REQUEST);
    }

    // Check existing refund record for ambiguous state
    const { data: existingRefund } = await supabase.from('refunds')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    if (existingRefund && existingRefund.status === REFUND_STATUS.PROCESSING && existingRefund.razorpay_refund_id) {
      throw new AppError('Refund is currently processing at payment gateway. Awaiting webhook reconciliation.', HTTP_STATUS.BAD_REQUEST);
    }

    let paymentRecord = null;
    const { data: pay } = await supabase.from('payments')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();
    paymentRecord = pay;

    await logAdminActivity(adminId, 'RAZORPAY_REFUND_RETRIED', 'order', order.id, {
      orderNumber: order.order_number
    }, req);

    return processOrderRefund({
      order,
      paymentRecord,
      adminId,
      reason: 'Retry failed refund by administrator',
      req
    });
  }

  return { status: REFUND_STATUS.PROCESSING, message: 'Refund retry initiated' };
};

module.exports = {
  REFUND_STATUS,
  processOrderRefund,
  retryFailedRefund
};
