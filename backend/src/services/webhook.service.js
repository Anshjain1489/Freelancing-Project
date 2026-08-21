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
    const { data: existingEvent } = await supabase.from('payment_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      return { status: 'ignored', message: 'Webhook event already processed.' };
    }

    // 3. Record Webhook Audit Event
    await supabase.from('payment_events').insert([{
      event_id: eventId,
      event_type: eventType,
      payload
    }]);

    // 4. Process event
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId && razorpayPaymentId) {
        const { data: payment } = await supabase.from('payments')
          .select('order_id, orders ( user_id )')
          .eq('razorpay_order_id', razorpayOrderId)
          .single();

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
  }

  return { status: 'success', event: eventType };
};

module.exports = { processRazorpayWebhook };
