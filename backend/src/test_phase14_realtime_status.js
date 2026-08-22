const assert = require('assert');
const supabase = require('./config/supabase');
const orderAdminService = require('./services/admin/orderAdmin.service');
const { ORDER_STATUS } = require('./services/orderStatus.service');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');
const sseManager = require('./notifications/sse.manager');
const AppError = require('./utils/AppError');

async function runRealtimeStatusTests() {
  console.log('====================================================');
  console.log('⚡ RUNNING PHASE 14: REAL-TIME ORDER STATUS UPDATE TESTS');
  console.log('====================================================\n');

  const adminId = 'cc55f73a-20e2-4525-9040-13eab45854ad';
  const customerId = 'cc55f73a-20e2-4525-9040-13eab45854ad';
  const timestamp = Date.now();
  const orderId = '00000000-0000-0000-0000-000000001401';

  try {
    // Setup Test Order
    if (supabase) {
      await supabase.from('payments').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);

      await supabase.from('orders').insert([{
        id: orderId,
        order_number: `CKS-RT-${timestamp}`,
        user_id: customerId,
        status: ORDER_STATUS.CONFIRMED,
        payment_status: 'PAID',
        payment_method: 'RAZORPAY',
        subtotal: 1200.00,
        total_amount: 1200.00
      }]);
    }

    // ----------------------------------------------------
    // TEST 1: Admin Updates Order Status (CONFIRMED -> PROCESSING)
    // ----------------------------------------------------
    console.log('▶ TEST 1: Admin Updates Order Status (CONFIRMED -> PROCESSING)');
    let eventEmitted = false;
    let eventPayload = null;

    const listener = (payload) => {
      eventEmitted = true;
      eventPayload = payload;
    };
    eventBus.once(EVENT_TYPES.ORDER_STATUS_UPDATED, listener);

    const updateRes = await orderAdminService.updateOrderStatus(adminId, orderId, { status: ORDER_STATUS.PROCESSING });

    assert(updateRes.newStatus === ORDER_STATUS.PROCESSING, `Expected status PROCESSING, got ${updateRes.newStatus}`);
    assert(eventEmitted, 'Expected ORDER_STATUS_UPDATED event to be emitted on eventBus');
    assert(eventPayload?.orderId === orderId, 'Expected eventPayload.orderId to match test order');
    console.log('✅ TEST 1 PASSED: Order status updated to PROCESSING & event emitted!\n');

    // ----------------------------------------------------
    // TEST 2: Transition to OUT_FOR_DELIVERY & Broadcast
    // ----------------------------------------------------
    console.log('▶ TEST 2: Transition to OUT_FOR_DELIVERY & Broadcast');
    const updateRes2 = await orderAdminService.updateOrderStatus(adminId, orderId, { status: ORDER_STATUS.OUT_FOR_DELIVERY });
    assert(updateRes2.newStatus === ORDER_STATUS.OUT_FOR_DELIVERY, `Expected status OUT_FOR_DELIVERY, got ${updateRes2.newStatus}`);
    console.log('✅ TEST 2 PASSED: Transitioned to OUT_FOR_DELIVERY cleanly!\n');

    // ----------------------------------------------------
    // TEST 3: Invalid Transition Rejection (DELIVERED -> PROCESSING)
    // ----------------------------------------------------
    console.log('▶ TEST 3: Invalid Transition Rejection');
    if (supabase) {
      await supabase.from('orders').update({ status: ORDER_STATUS.DELIVERED }).eq('id', orderId);
    }

    let invalidRejected = false;
    try {
      await orderAdminService.updateOrderStatus(adminId, orderId, { status: ORDER_STATUS.PROCESSING });
    } catch (err) {
      if (err.statusCode === 400 || err.message?.includes('Invalid order status transition')) {
        invalidRejected = true;
      }
    }
    assert(invalidRejected, 'Expected invalid transition DELIVERED -> PROCESSING to be rejected');
    console.log('✅ TEST 3 PASSED: Invalid order status transition strictly rejected!\n');

    // ----------------------------------------------------
    // TEST 4: Concurrent Admin Update Protection (409 Conflict)
    // ----------------------------------------------------
    console.log('▶ TEST 4: Concurrent Admin Update Protection (409 Conflict)');
    const orderId4 = '00000000-0000-0000-0000-000000001404';
    if (supabase) {
      await supabase.from('orders').delete().eq('id', orderId4);
      await supabase.from('orders').insert([{
        id: orderId4,
        order_number: `CKS-CONC-${timestamp}`,
        user_id: customerId,
        status: ORDER_STATUS.CONFIRMED,
        subtotal: 500.00,
        total_amount: 500.00
      }]);

      const [r1, r2] = await Promise.allSettled([
        orderAdminService.updateOrderStatus(adminId, orderId4, { status: ORDER_STATUS.PROCESSING }),
        orderAdminService.updateOrderStatus(adminId, orderId4, { status: ORDER_STATUS.PROCESSING })
      ]);

      const fulfilled = [r1, r2].filter(r => r.status === 'fulfilled');
      const rejected = [r1, r2].filter(r => r.status === 'rejected');

      assert(fulfilled.length === 1, `Expected exactly 1 admin update to succeed, got ${fulfilled.length}`);
      assert(rejected.length === 1, `Expected exactly 1 admin update to fail with 409 Conflict, got ${rejected.length}`);
      assert(rejected[0].reason?.statusCode === 409, 'Expected HTTP 409 Conflict error code');
    }
    console.log('✅ TEST 4 PASSED: Concurrent admin update strictly protected with HTTP 409 Conflict!\n');

    console.log('====================================================');
    console.log('🎉 ALL PHASE 14 REAL-TIME ORDER STATUS TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ REAL-TIME STATUS TEST FAILED:', err);
    process.exit(1);
  }
}

runRealtimeStatusTests();
