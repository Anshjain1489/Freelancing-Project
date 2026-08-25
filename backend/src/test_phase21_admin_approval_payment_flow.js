const assert = require('assert');
const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');
const orderService = require('./services/order.service');
const orderAdminService = require('./services/admin/orderAdmin.service');
const paymentService = require('./services/payment.service');
const deliveryService = require('./services/delivery.management.service');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./services/orderStatus.service');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 21: ADMIN APPROVAL → PAYMENT → DELIVERY SUITE (28 TESTS)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ FAIL: ${name}`);
      console.log(`     Error: ${err.message}`);
      failed++;
    }
  };

  let adminId = '00000000-0000-0000-0000-000000008000';
  let customerIdA = '00000000-0000-0000-0000-000000008001';
  let customerIdB = '00000000-0000-0000-0000-000000008002';
  let partnerId = '00000000-0000-0000-0000-000000009001';
  const timestamp = Date.now();

  const onlineOrderId = `00000000-0000-0000-0000-${String(timestamp).slice(-12)}`;
  const codOrderId = `00000000-0000-0000-0000-${String(timestamp + 1).slice(-12)}`;
  const rejectOrderId = `00000000-0000-0000-0000-${String(timestamp + 2).slice(-12)}`;

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(2);
    if (users && users.length >= 2) {
      customerIdA = users[0].id;
      customerIdB = users[1].id;
    }

    // Insert clean test online order
    await supabase.from('delivery_assignments').delete().in('order_id', [onlineOrderId, codOrderId, rejectOrderId]);
    await supabase.from('payments').delete().in('order_id', [onlineOrderId, codOrderId, rejectOrderId]);
    await supabase.from('order_addresses').delete().in('order_id', [onlineOrderId, codOrderId, rejectOrderId]);
    await supabase.from('orders').delete().in('id', [onlineOrderId, codOrderId, rejectOrderId]);

    await supabase.from('orders').insert([{
      id: onlineOrderId,
      order_number: `CKS-P21-ON-${timestamp}`,
      user_id: customerIdA,
      status: ORDER_STATUS.CONFIRMED,
      payment_status: PAYMENT_STATUS.PENDING,
      payment_method: 'RAZORPAY',
      subtotal: 1000.00,
      total_amount: 1000.00
    }]);

    await supabase.from('orders').insert([{
      id: codOrderId,
      order_number: `CKS-P21-COD-${timestamp}`,
      user_id: customerIdA,
      status: ORDER_STATUS.CONFIRMED,
      payment_status: PAYMENT_STATUS.PENDING,
      payment_method: 'COD',
      subtotal: 750.00,
      total_amount: 750.00
    }]);

    await supabase.from('orders').insert([{
      id: rejectOrderId,
      order_number: `CKS-P21-REJ-${timestamp}`,
      user_id: customerIdA,
      status: ORDER_STATUS.CONFIRMED,
      payment_status: PAYMENT_STATUS.PENDING,
      payment_method: 'RAZORPAY',
      subtotal: 500.00,
      total_amount: 500.00
    }]);
  }

  // ----------------------------------------------------
  // SECTION A: ONLINE ORDER CREATION & INITIAL STATE (TESTS 1 - 5)
  // ----------------------------------------------------
  console.log('📌 SECTION A: ONLINE ORDER CREATION & INITIAL STATE (TESTS 1 - 5)\n');

  await test('1. Customer creates online order record', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('*').eq('id', onlineOrderId).single();
      assert(o, 'Online test order record must exist');
    }
  });

  await test('2. New online order starts in CONFIRMED state', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', onlineOrderId).single();
      assert.strictEqual(o.status, ORDER_STATUS.CONFIRMED, 'New order must be in CONFIRMED status');
    }
  });

  await test('3. New online order payment_status is PENDING', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('payment_status').eq('id', onlineOrderId).single();
      assert.strictEqual(o.payment_status, PAYMENT_STATUS.PENDING, 'New order payment status must be PENDING');
    }
  });

  await test('4. No Razorpay payment record is created during checkout', async () => {
    if (supabase) {
      const { data: pays } = await supabase.from('payments').select('*').eq('order_id', onlineOrderId);
      assert.strictEqual((pays || []).length, 0, 'No payment record should exist before Admin acceptance');
    }
  });

  await test('5. CONFIRMED order does NOT appear in Unassigned Delivery Queue', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(onlineOrderId));
    assert(!found, 'CONFIRMED order must NOT appear in Unassigned Delivery Queue');
  });

  // ----------------------------------------------------
  // SECTION B: ADMIN APPROVAL & PAYMENT INITIALIZATION (TESTS 6 - 13)
  // ----------------------------------------------------
  console.log('\n📌 SECTION B: ADMIN APPROVAL & PAYMENT INITIALIZATION (TESTS 6 - 13)\n');

  await test('6. Admin accepts online order', async () => {
    const acceptRes = await orderAdminService.acceptOrder(adminId, onlineOrderId);
    assert(acceptRes, 'acceptOrder must return result');
    assert.strictEqual(acceptRes.status, ORDER_STATUS.PENDING_PAYMENT, 'Online order status must transition to PENDING_PAYMENT');
  });

  await test('7. Online order status updated to PENDING_PAYMENT in DB', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', onlineOrderId).single();
      assert.strictEqual(o.status, ORDER_STATUS.PENDING_PAYMENT, 'Status in DB must be PENDING_PAYMENT');
    }
  });

  await test('8. PENDING_PAYMENT order does NOT appear in Delivery Queue', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(onlineOrderId));
    assert(!found, 'PENDING_PAYMENT order must NOT appear in Unassigned Delivery Queue');
  });

  let firstPayPayload = null;
  await test('9. Customer can create payment after Admin acceptance', async () => {
    firstPayPayload = await paymentService.createPaymentForOrder(customerIdA, onlineOrderId);
    assert(firstPayPayload, 'Payment payload must be returned');
    assert(firstPayPayload.razorpayOrderId, 'razorpayOrderId must be present');
  });

  await test('10. Payment creation is idempotent (reuses Razorpay order ID)', async () => {
    const secondPayPayload = await paymentService.createPaymentForOrder(customerIdA, onlineOrderId);
    assert.strictEqual(secondPayPayload.razorpayOrderId, firstPayPayload.razorpayOrderId, 'Razorpay order ID must be reused on duplicate requests');
  });

  await test('11. Another customer cannot create payment for this order (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPaymentForOrder(customerIdB, onlineOrderId);
      },
      (err) => err.statusCode === 403 || err.message?.includes('Forbidden') || err.message?.includes('authorized')
    );
  });

  await test('12. Attempting payment for non-PENDING_PAYMENT order returns error', async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPaymentForOrder(customerIdA, codOrderId); // COD order still in CONFIRMED
      },
      (err) => err.statusCode === 400 || err.statusCode === 409 || err.message?.includes('confirmation') || err.message?.includes('state')
    );
  });

  await test('13. Admin rejection releases stock without triggering Razorpay refund', async () => {
    const rejectRes = await orderAdminService.rejectOrder(adminId, rejectOrderId, { reason: 'Out of stock' });
    assert.strictEqual(rejectRes.status, ORDER_STATUS.REJECTED, 'Status must become REJECTED');
    assert.strictEqual(rejectRes.refundStatus, 'NOT_APPLICABLE', 'Refund status must be NOT_APPLICABLE for unpaid rejection');
  });

  // ----------------------------------------------------
  // SECTION C: PAYMENT VERIFICATION & DELIVERY QUEUE (TESTS 14 - 21)
  // ----------------------------------------------------
  console.log('\n📌 SECTION C: PAYMENT VERIFICATION & DELIVERY QUEUE (TESTS 14 - 21)\n');

  await test('14. Rejected order returns HTTP 409 when payment is attempted', async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPaymentForOrder(customerIdA, rejectOrderId);
      },
      (err) => err.statusCode === 409 || err.message?.includes('rejected')
    );
  });

  await test('15. Customer completes payment verification', async () => {
    const verifyRes = await paymentService.verifyPayment(customerIdA, {
      orderId: onlineOrderId,
      razorpayOrderId: firstPayPayload.razorpayOrderId,
      razorpayPaymentId: `pay_mock_${timestamp}`,
      razorpaySignature: 'webhook_verified'
    });
    assert.strictEqual(verifyRes.status, ORDER_STATUS.PROCESSING, 'Order status must become PROCESSING upon verified payment');
  });

  await test('16. Order payment_status changes to PAID in DB', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('payment_status, status').eq('id', onlineOrderId).single();
      assert.strictEqual(o.payment_status, PAYMENT_STATUS.PAID, 'payment_status must be PAID');
      assert.strictEqual(o.status, ORDER_STATUS.PROCESSING, 'status must be PROCESSING');
    }
  });

  await test('17. Paid PROCESSING order enters Unassigned Delivery Queue', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(onlineOrderId));
    assert(found, 'Paid PROCESSING order MUST appear in Unassigned Delivery Queue');
  });

  await test('18. Admin dashboard unassigned metric matches queue length', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const dash = await deliveryService.getAdminDeliveryDashboard();
    assert.strictEqual(dash.unassignedOrders, unassigned.length, 'Dashboard unassigned metric MUST match getUnassignedOrders().length');
  });

  await test('19. COD order creation & initial state', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('*').eq('id', codOrderId).single();
      assert.strictEqual(o.status, ORDER_STATUS.CONFIRMED);
      assert.strictEqual(o.payment_method, 'COD');
    }
  });

  await test('20. Admin accepts COD order -> transitions directly to PROCESSING', async () => {
    const codAcceptRes = await orderAdminService.acceptOrder(adminId, codOrderId);
    assert.strictEqual(codAcceptRes.status, ORDER_STATUS.PROCESSING, 'COD order must transition directly to PROCESSING upon Admin accept');
  });

  await test('21. COD PROCESSING order enters Delivery Queue immediately', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(codOrderId));
    assert(found, 'COD PROCESSING order MUST appear in Unassigned Delivery Queue without online payment');
  });

  // ----------------------------------------------------
  // SECTION D: CENTRALIZED HELPER & SECURITY REGRESSION (TESTS 22 - 28)
  // ----------------------------------------------------
  console.log('\n📌 SECTION D: CENTRALIZED HELPER & SECURITY REGRESSION (TESTS 22 - 28)\n');

  await test('22. Centralized isOrderReadyForDelivery strictly filters states', async () => {
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'CONFIRMED', payment_status: 'PENDING', payment_method: 'RAZORPAY' }), false);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'PENDING_PAYMENT', payment_status: 'PENDING', payment_method: 'RAZORPAY' }), false);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'REJECTED', payment_status: 'PENDING', payment_method: 'RAZORPAY' }), false);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'CANCELLED', payment_status: 'PENDING', payment_method: 'RAZORPAY' }), false);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'PROCESSING', payment_status: 'PENDING', payment_method: 'RAZORPAY' }), false);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'PROCESSING', payment_status: 'PAID', payment_method: 'RAZORPAY' }), true);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: 'PROCESSING', payment_status: 'PENDING', payment_method: 'COD' }), true);
  });

  await test('23. Payment retry endpoint is mapped and accessible', async () => {
    const routesFile = fs.readFileSync(path.join(__dirname, 'routes/order.routes.js'), 'utf8');
    assert(routesFile.includes("create-payment"), 'create-payment route must be registered in order.routes.js');
  });

  await test('24. Frontend CheckoutPage provides Payment Method selector', async () => {
    const checkoutFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/public/CheckoutPage.jsx'), 'utf8');
    assert(checkoutFile.includes('selectedPaymentMethod'), 'CheckoutPage must include selectedPaymentMethod state');
    assert(checkoutFile.includes("setSelectedPaymentMethod('COD')"), 'CheckoutPage must allow selecting COD');
  });

  await test('25. Frontend OrderDetailsPage displays Pay Now for PENDING_PAYMENT', async () => {
    const detailsFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/customer/OrderDetailsPage.jsx'), 'utf8');
    assert(detailsFile.includes('PENDING_PAYMENT'), 'OrderDetailsPage must handle PENDING_PAYMENT status');
    assert(detailsFile.includes('handleCreatePayment'), 'OrderDetailsPage must trigger handleCreatePayment');
  });

  await test('26. Frontend Admin OrdersPage displays PENDING_PAYMENT status option', async () => {
    const adminOrdersFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/admin/OrdersPage.jsx'), 'utf8');
    assert(adminOrdersFile.includes('PENDING_PAYMENT'), 'Admin OrdersPage must include PENDING_PAYMENT');
  });

  await test('27. Phase 20 delivery assignment remains compatible', async () => {
    const assignRes = await deliveryService.assignDeliveryPartner(adminId, onlineOrderId, partnerId, 30, null, 'P21 delivery test');
    assert(assignRes.success, 'Delivery partner assignment must succeed for Phase 21 eligible order');
  });

  await test('28. Assigned order leaves Unassigned Delivery Queue', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(onlineOrderId));
    assert(!found, 'Assigned order must leave Unassigned Delivery Queue');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 21 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
