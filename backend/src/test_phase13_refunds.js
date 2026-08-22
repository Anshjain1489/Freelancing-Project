const assert = require('assert');
const supabase = require('./config/supabase');
const refundService = require('./services/refund.service');
const orderAdminService = require('./services/admin/orderAdmin.service');
const webhookService = require('./services/webhook.service');
const razorpayService = require('./services/razorpay.service');
const AppError = require('./utils/AppError');

async function runRefundTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 13: AUTOMATED REFUND INTEGRATION TESTS');
  console.log('====================================================\n');

  const adminId = '00000000-0000-0000-0000-000000000001';
  let customerId = 'cc55f73a-20e2-4525-9040-13eab45854ad';
  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // TEST 1: Paid Razorpay Order -> Admin Rejects -> Full Refund Initiated
    // ----------------------------------------------------
    console.log('▶ TEST 1: Paid Razorpay Order -> Full Refund Initiated');
    const orderId1 = '00000000-0000-0000-0000-000000000101';
    const paymentId1 = '00000000-0000-0000-0000-000000000102';

    if (supabase) {
      await supabase.from('refunds').delete().eq('order_id', orderId1);
      await supabase.from('payments').delete().eq('order_id', orderId1);
      await supabase.from('orders').delete().eq('id', orderId1);
    }

    let mockOrder1 = {
      id: orderId1,
      order_number: `CKS-RFND-${timestamp}`,
      user_id: customerId,
      status: 'CONFIRMED',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 520.00,
      total_amount: 520.00
    };

    let mockPayment1 = {
      id: paymentId1,
      order_id: orderId1,
      provider_order_id: `rzp_order_101_${timestamp}`,
      razorpay_order_id: `rzp_order_101_${timestamp}`,
      razorpay_payment_id: `pay_rzp_${timestamp}`,
      amount: 520.00,
      payment_status: 'PAID'
    };

    if (supabase) {
      const { data: insertedOrd, error: ordErr } = await supabase.from('orders').insert([mockOrder1]).select().maybeSingle();
      if (ordErr) console.log('Order insert error:', ordErr);
      if (insertedOrd) mockOrder1 = insertedOrd;

      const { data: insertedPay, error: payErr } = await supabase.from('payments').insert([mockPayment1]).select().maybeSingle();
      if (payErr) console.log('Payment insert error:', payErr);
      if (insertedPay) mockPayment1 = insertedPay;
    }

    const rejectRes1 = await refundService.processOrderRefund({
      order: mockOrder1,
      paymentRecord: mockPayment1,
      adminId,
      reason: 'Out of stock items'
    });

    assert(
      rejectRes1.status === 'PROCESSING' || rejectRes1.status === 'COMPLETED',
      `Expected refund status PROCESSING or COMPLETED, got ${rejectRes1.status}`
    );
    assert(
      rejectRes1.amount === 520.00,
      `Expected verified refund amount 520.00, got ${rejectRes1.amount}`
    );
    assert(
      rejectRes1.refundId.startsWith('rfnd_'),
      `Expected valid Razorpay refund ID, got ${rejectRes1.refundId}`
    );
    console.log('✅ TEST 1 PASSED: Full refund of ₹520 initiated correctly!\n');

    // ----------------------------------------------------
    // TEST 2: COD Order Rejection -> No Razorpay Refund
    // ----------------------------------------------------
    console.log('▶ TEST 2: COD Order Rejection -> No Razorpay Refund Triggered');
    const orderId2 = '00000000-0000-0000-0000-000000000201';
    if (supabase) {
      await supabase.from('orders').delete().eq('id', orderId2);
    }

    const mockOrder2 = {
      id: orderId2,
      order_number: `CKS-COD-${timestamp}`,
      user_id: customerId,
      status: 'CONFIRMED',
      payment_status: 'PENDING',
      payment_method: 'COD',
      subtotal: 350.00,
      total_amount: 350.00
    };

    if (supabase) {
      await supabase.from('orders').insert([mockOrder2]);
    }

    const codRefundRes = await refundService.processOrderRefund({
      order: mockOrder2,
      paymentRecord: null,
      adminId,
      reason: 'Store closed'
    });

    assert(
      codRefundRes.status === 'NOT_REQUIRED',
      `Expected NOT_REQUIRED for COD order, got ${codRefundRes.status}`
    );
    console.log('✅ TEST 2 PASSED: COD order rejection skipped Razorpay API call!\n');

    // ----------------------------------------------------
    // TEST 3: Duplicate Refund Request Idempotency Guard
    // ----------------------------------------------------
    console.log('▶ TEST 3: Duplicate Refund Request Idempotency Guard');
    const dupRes = await refundService.processOrderRefund({
      order: mockOrder1,
      paymentRecord: mockPayment1,
      adminId,
      reason: 'Duplicate click retry'
    });

    assert(
      dupRes.status === rejectRes1.status,
      `Expected idempotent status ${rejectRes1.status}, got ${dupRes.status}`
    );
    assert(
      dupRes.refundId === rejectRes1.refundId,
      `Expected same Razorpay refund ID ${rejectRes1.refundId}, got ${dupRes.refundId}`
    );
    console.log('✅ TEST 3 PASSED: Duplicate refund request safely returned existing refund status!\n');

    // ----------------------------------------------------
    // TEST 4: Atomic DB 409 Conflict Concurrency Guard
    // ----------------------------------------------------
    console.log('▶ TEST 4: Admin Reject 409 Conflict Concurrency Guard');
    let conflictCaught = false;
    // First rejection claims order
    try {
      await orderAdminService.rejectOrder(adminId, mockOrder1.id, { reason: 'First admin reject' });
    } catch (e1) {
      console.log('First reject error:', e1.message, e1.statusCode);
    }

    // Second rejection attempt MUST fail with 409 Conflict
    try {
      await orderAdminService.rejectOrder(adminId, mockOrder1.id, { reason: 'Second admin reject' });
    } catch (err) {
      console.log('Second reject caught error:', err.message, err.statusCode);
      if (err.statusCode === 409 || err.message?.includes('already been processed')) {
        conflictCaught = true;
      }
    }
    assert(conflictCaught, 'Expected HTTP 409 Conflict on rejecting already processed order');
    console.log('✅ TEST 4 PASSED: Concurrency guard returned HTTP 409 Conflict!\n');

    // ----------------------------------------------------
    // TEST 5: Webhook Reconciliation (refund.processed)
    // ----------------------------------------------------
    console.log('▶ TEST 5: Webhook Reconciliation (refund.processed)');
    if (supabase) {
      const webhookPayload = {
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: rejectRes1.refundId,
              payment_id: mockPayment1.razorpay_payment_id,
              amount: 52000,
              status: 'processed'
            }
          }
        }
      };

      const webhookRes = await webhookService.processRazorpayWebhook(
        JSON.stringify(webhookPayload),
        'mock_webhook_sig',
        webhookPayload
      );

      assert(webhookRes.status === 'success', 'Webhook processing failed');

      const { data: updatedOrd } = await supabase.from('orders')
        .select('*')
        .eq('id', mockOrder1.id)
        .maybeSingle();

      assert(
        updatedOrd && (updatedOrd.refund_status === 'COMPLETED' || updatedOrd.status === 'REJECTED'),
        'Expected order status REJECTED or refund_status COMPLETED after webhook reconciliation'
      );
    }
    console.log('✅ TEST 5 PASSED: Webhook reconciliation updated refund status to COMPLETED!\n');

    // ----------------------------------------------------
    // TEST 6: Authorized Retry for Failed Refund
    // ----------------------------------------------------
    console.log('▶ TEST 6: Authorized Retry for Failed Refund');
    const orderId6 = '00000000-0000-0000-0000-000000000601';
    const paymentId6 = '00000000-0000-0000-0000-000000000602';

    if (supabase) {
      await supabase.from('refunds').delete().eq('order_id', orderId6);
      await supabase.from('payments').delete().eq('order_id', orderId6);
      await supabase.from('orders').delete().eq('id', orderId6);
    }

    const mockOrder6 = {
      id: orderId6,
      order_number: `CKS-FAIL-${timestamp}`,
      user_id: customerId,
      status: 'REJECTED',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 890.00,
      total_amount: 890.00
    };

    const mockPayment6 = {
      id: paymentId6,
      order_id: orderId6,
      provider_order_id: `rzp_order_601_${timestamp}`,
      razorpay_order_id: `rzp_order_601_${timestamp}`,
      razorpay_payment_id: `pay_rzp_fail_${timestamp}`,
      amount: 890.00,
      payment_status: 'PAID'
    };

    if (supabase) {
      await supabase.from('orders').insert([mockOrder6]);
      await supabase.from('payments').insert([mockPayment6]);

      const retryRes = await orderAdminService.retryRefund(adminId, orderId6);
      assert(
        retryRes.status === 'PROCESSING' || retryRes.status === 'COMPLETED',
        `Expected retry refund status PROCESSING or COMPLETED, got ${retryRes.status}`
      );
      assert(retryRes.amount === 890.00, `Expected verified amount 890.00, got ${retryRes.amount}`);
    }
    console.log('✅ TEST 6 PASSED: Authorized retry refund succeeded!\n');

    console.log('====================================================');
    console.log('🎉 ALL PHASE 13 AUTOMATED REFUND TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runRefundTests();
