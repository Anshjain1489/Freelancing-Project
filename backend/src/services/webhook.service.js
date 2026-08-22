const supabase = require('../config/supabase');
const razorpayService = require('./razorpay.service');
const paymentService = require('./payment.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const processRazorpayWebhook = async (rawBody, signature, payload) => {
  // 1. Verify Webhook Signature
  const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    throw new AppError('Invalid webhook signature', HTTP_STATUS.BAD_REQUEST);
  }

  const eventType = payload.event;
  const eventId = payload.contains?.[0] || `evt_${Date.now()}`;
  const paymentEntity = payload.payload?.payment?.entity;
  const orderEntity = payload.payload?.order?.entity;

  if (supabase) {
    // 2. IDEMPOTENCY CHECK: Check if webhook event already processed
    try {
      const { data: existingEvent } = await supabase.from('payment_events')
        .select('id')
        .eq('provider_event_id', eventId)
        .maybeSingle();

      if (existingEvent) {
        return { status: 'ignored', message: 'Webhook event already processed.' };
      }

      // 3. Record Webhook Audit Event
      await supabase.from('payment_events').insert([{
        provider_event_id: eventId,
        event_type: eventType,
        payload
      }]);
    } catch {}

    // 4. Process Payment Events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId && razorpayPaymentId) {
        const { data: payment } = await supabase.from('payments')
          .select('order_id, orders ( user_id )')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (payment && payment.orders?.user_id) {
          await paymentService.verifyPayment(
            payment.orders.user_id,
            {
              orderId: payment.order_id,
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature: 'webhook_verified'
            }
          );
        }
      }
    }

    // 5. Process Refund Events
    if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundEntity = payload.payload?.refund?.entity;
      const razorpayRefundId = refundEntity?.id;
      const razorpayPaymentId = refundEntity?.payment_id;

      if (razorpayRefundId || razorpayPaymentId) {
        const { data: refundRecord } = await supabase.from('refunds')
          .select('*, orders ( id, order_number, user_id )')
          .or(`razorpay_refund_id.eq.${razorpayRefundId},payment_id.eq.${razorpayPaymentId}`)
          .maybeSingle();

        if (refundRecord) {
          await supabase.from('refunds').update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('id', refundRecord.id);

          await supabase.from('orders').update({ refund_status: 'COMPLETED' }).eq('id', refundRecord.order_id);
          await supabase.from('payments').update({ refund_status: 'COMPLETED', payment_status: 'REFUNDED' }).eq('order_id', refundRecord.order_id);

          const eventBus = require('../events/eventBus');
          const EVENT_TYPES = require('../events/eventTypes');
          const sseManager = require('../notifications/sse.manager');

          eventBus.emit(EVENT_TYPES.REFUND_COMPLETED, {
            userId: refundRecord.orders?.user_id,
            orderId: refundRecord.order_id,
            orderNumber: refundRecord.orders?.order_number,
            amount: refundRecord.amount,
            razorpayRefundId
          });

          sseManager.broadcastDecision({
            orderId: refundRecord.order_id,
            orderNumber: refundRecord.orders?.order_number,
            status: 'REJECTED',
            paymentStatus: 'REFUNDED',
            refundStatus: 'COMPLETED',
            refundAmount: refundRecord.amount,
            razorpayRefundId
          });
        }
      }
    }

    if (eventType === 'refund.failed') {
      const refundEntity = payload.payload?.refund?.entity;
      const razorpayRefundId = refundEntity?.id;
      const failureReason = refundEntity?.error_description || 'Refund failed at gateway';

      if (razorpayRefundId) {
        const { data: refundRecord } = await supabase.from('refunds')
          .select('*, orders ( id, order_number, user_id )')
          .eq('razorpay_refund_id', razorpayRefundId)
          .maybeSingle();

        if (refundRecord) {
          await supabase.from('refunds').update({
            status: 'FAILED',
            failure_reason: failureReason,
            updated_at: new Date().toISOString()
          }).eq('id', refundRecord.id);

          await supabase.from('orders').update({ refund_status: 'FAILED' }).eq('id', refundRecord.order_id);
          await supabase.from('payments').update({ refund_status: 'FAILED' }).eq('order_id', refundRecord.order_id);

          const eventBus = require('../events/eventBus');
          const EVENT_TYPES = require('../events/eventTypes');
          const sseManager = require('../notifications/sse.manager');

          eventBus.emit(EVENT_TYPES.REFUND_FAILED, {
            userId: refundRecord.orders?.user_id,
            orderId: refundRecord.order_id,
            orderNumber: refundRecord.orders?.order_number,
            failureReason
          });

          sseManager.broadcastDecision({
            orderId: refundRecord.order_id,
            orderNumber: refundRecord.orders?.order_number,
            status: 'REJECTED',
            paymentStatus: 'PAID',
            refundStatus: 'FAILED',
            failureReason
          });
        }
      }
    }
  }

  return { status: 'success', event: eventType };
};

module.exports = { processRazorpayWebhook };
