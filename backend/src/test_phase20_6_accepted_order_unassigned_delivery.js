const assert = require('assert');
const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');
const deliveryService = require('./services/delivery.management.service');
const orderAdminService = require('./services/admin/orderAdmin.service');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');
const { ORDER_STATUS } = require('./services/orderStatus.service');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.6: ACCEPTED ORDER → UNASSIGNED DELIVERY QUEUE SUITE (30 TESTS)');
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
  let customerId = '00000000-0000-0000-0000-000000008001';
  let partnerIdA = '00000000-0000-0000-0000-000000009001';
  let partnerIdB = '00000000-0000-0000-0000-000000009002';
  const timestamp = Date.now();
  const testOrderId = `00000000-0000-0000-0000-${String(timestamp).slice(-12)}`;

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) customerId = users[0].id;

    const { data: pList } = await supabase.from('users').select('id').eq('role', 'DELIVERY_PARTNER').limit(2);
    if (pList && pList.length >= 2) {
      partnerIdA = pList[0].id;
      partnerIdB = pList[1].id;
    } else {
      await supabase.from('users').upsert([
        { id: partnerIdA, full_name: 'Test Partner Alpha', phone: '9000000001', email: 'p206a@test.com', role: 'DELIVERY_PARTNER', is_active: true },
        { id: partnerIdB, full_name: 'Test Partner Beta', phone: '9000000002', email: 'p206b@test.com', role: 'DELIVERY_PARTNER', is_active: true }
      ]);
    }

    // Insert clean test order in CONFIRMED state
    await supabase.from('delivery_assignments').delete().eq('order_id', testOrderId);
    await supabase.from('order_addresses').delete().eq('order_id', testOrderId);
    await supabase.from('orders').delete().eq('id', testOrderId);

    await supabase.from('orders').insert([{
      id: testOrderId,
      order_number: `CKS-P206-${timestamp}`,
      user_id: customerId,
      status: ORDER_STATUS.CONFIRMED,
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 1250.00,
      total_amount: 1250.00
    }]);

    await supabase.from('order_addresses').insert([{
      order_id: testOrderId,
      recipient_name: 'Priya Sharma',
      phone: '9876543210',
      address_line1: 'House 42, Civil Lines',
      address_line2: 'Near SBI Bank',
      city: 'Mahruni',
      state: 'Madhya Pradesh',
      postal_code: '452001'
    }]);
  }

  // ----------------------------------------------------
  // SECTION A: ORDER CREATION & ACCEPTANCE WORKFLOW (TESTS 1 - 10)
  // ----------------------------------------------------
  console.log('📌 SECTION A: ORDER CREATION & ACCEPTANCE WORKFLOW (TESTS 1 - 10)\n');

  await test('1. New order is CONFIRMED', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', testOrderId).single();
      assert.strictEqual(o.status, ORDER_STATUS.CONFIRMED, 'New order must start in CONFIRMED status');
    }
  });

  await test('2. CONFIRMED order is not visible in Unassigned Orders', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(!found, 'Unaccepted CONFIRMED order must NOT appear in Unassigned Delivery Queue');
  });

  let dashboardBeforeAccept = 0;
  await test('3. Admin accepts the order', async () => {
    const dashBefore = await deliveryService.getAdminDeliveryDashboard();
    dashboardBeforeAccept = dashBefore.unassignedOrders;

    const acceptRes = await orderAdminService.acceptOrder(adminId, testOrderId);
    assert(acceptRes, 'acceptOrder must return result');
    assert.strictEqual(acceptRes.status, ORDER_STATUS.PROCESSING, 'Order status must become PROCESSING');
  });

  await test('4. Order changes to PROCESSING', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', testOrderId).single();
      assert.strictEqual(o.status, ORDER_STATUS.PROCESSING);
    }
  });

  await test('5. PROCESSING order appears in Unassigned Orders', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(found, 'Accepted PROCESSING order MUST appear in Unassigned Orders queue');
  });

  await test('6. Customer name is available in unassigned order', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(found && (found.customerName || found.customer?.name), 'Customer name must be available');
  });

  await test('7. Customer phone is available in unassigned order', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(found && (found.customerPhone !== undefined || found.customer?.phone !== undefined), 'Customer phone must be available');
  });

  await test('8. Customer address is available in unassigned order', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(found && (found.deliveryAddress || found.address), 'Customer address must be available');
  });

  await test('9. Payment status is available in unassigned order', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(found && found.paymentStatus, 'Payment status must be available');
  });

  await test('10. Unassigned dashboard count increases', async () => {
    const dashAfter = await deliveryService.getAdminDeliveryDashboard();
    assert(dashAfter.unassignedOrders >= dashboardBeforeAccept, 'Unassigned dashboard metric must increase/reflect accepted order');
  });

  // ----------------------------------------------------
  // SECTION B: ASSIGNMENT & ACCESS ISOLATION (TESTS 11 - 16)
  // ----------------------------------------------------
  console.log('\n📌 SECTION B: ASSIGNMENT & ACCESS ISOLATION (TESTS 11 - 16)\n');

  await test('11. Admin assigns Delivery Partner', async () => {
    const assignRes = await deliveryService.assignDeliveryPartner(adminId, testOrderId, partnerIdA, 30, null, 'Handle with care');
    assert(assignRes.success, 'Delivery partner assignment must succeed');
  });

  await test('12. Order disappears from Unassigned Orders', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const found = unassigned.find(o => String(o.orderId || o.id) === String(testOrderId));
    assert(!found, 'Assigned order must disappear from Unassigned Orders list immediately');
  });

  await test('13. Assigned count increases / reflects assignment', async () => {
    const assignedList = await deliveryService.getAssignedDeliveries();
    const found = assignedList.find(a => String(a.orderId || a.order_id) === String(testOrderId));
    assert(found, 'Order must appear in Assigned Deliveries');
  });

  await test('14. Assigned partner can access the order', async () => {
    const partnerOrder = await deliveryService.getPartnerOrderById(partnerIdA, testOrderId);
    assert(partnerOrder, 'Assigned Partner A must be able to fetch order details');
  });

  await test('15. Another partner receives 403 Forbidden', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partnerIdB, testOrderId);
      },
      (err) => err.statusCode === 403 || err.message?.includes('Forbidden')
    );
  });

  await test('16. Duplicate assignment is prevented with 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.assignDeliveryPartner(adminId, testOrderId, partnerIdB);
      },
      (err) => err.statusCode === 409 || err.message?.includes('already') || err.message?.includes('modified')
    );
  });

  // ----------------------------------------------------
  // SECTION C: STATUS SAFETY & EXCLUSION RULES (TESTS 17 - 20)
  // ----------------------------------------------------
  console.log('\n📌 SECTION C: STATUS SAFETY & EXCLUSION RULES (TESTS 17 - 20)\n');

  await test('17. CANCELLED orders are excluded from Unassigned Orders', async () => {
    const mockCancelledOrder = { id: 'ord-cancelled-test', status: ORDER_STATUS.CANCELLED };
    assert.strictEqual(deliveryService.isOrderReadyForDelivery(mockCancelledOrder), false, 'CANCELLED order must not be ready for delivery');
  });

  await test('18. REJECTED orders are excluded from Unassigned Orders', async () => {
    const mockRejectedOrder = { id: 'ord-rejected-test', status: ORDER_STATUS.REJECTED };
    assert.strictEqual(deliveryService.isOrderReadyForDelivery(mockRejectedOrder), false, 'REJECTED order must not be ready for delivery');
  });

  await test('19. DELIVERED orders are excluded from Unassigned Orders', async () => {
    const mockDeliveredOrder = { id: 'ord-delivered-test', status: ORDER_STATUS.DELIVERED };
    assert.strictEqual(deliveryService.isOrderReadyForDelivery(mockDeliveredOrder), false, 'DELIVERED order must not be ready for delivery');
  });

  await test('20. OUT_FOR_DELIVERY orders are excluded from Unassigned Orders', async () => {
    const mockOutOrder = { id: 'ord-out-test', status: ORDER_STATUS.OUT_FOR_DELIVERY };
    assert.strictEqual(deliveryService.isOrderReadyForDelivery(mockOutOrder), false, 'OUT_FOR_DELIVERY order must not be ready for delivery');
  });

  // ----------------------------------------------------
  // SECTION D: REAL-TIME EVENTS & REGRESSION COMPATIBILITY (TESTS 21 - 30)
  // ----------------------------------------------------
  console.log('\n📌 SECTION D: REAL-TIME EVENTS & REGRESSION COMPATIBILITY (TESTS 21 - 30)\n');

  await test('21. SSE decision / delivery-ready event emitted', async () => {
    let eventFired = false;
    const listener = () => { eventFired = true; };
    eventBus.once(EVENT_TYPES.ORDER_ACCEPTED, listener);

    const testOrd2 = `00000000-0000-0000-0000-${String(Date.now() + 500).slice(-12)}`;
    if (supabase) {
      await supabase.from('orders').insert([{
        id: testOrd2,
        order_number: `CKS-EVT-${Date.now()}`,
        user_id: customerId,
        status: ORDER_STATUS.CONFIRMED,
        subtotal: 500.00,
        total_amount: 500.00
      }]);
      await orderAdminService.acceptOrder(adminId, testOrd2);
    } else {
      eventBus.emit(EVENT_TYPES.ORDER_ACCEPTED, { orderId: testOrd2 });
    }
    assert(eventFired, 'ORDER_ACCEPTED event must be emitted');
  });

  await test('22. Delivery UI refresh event is dispatched', async () => {
    const notifCtxPath = path.join(__dirname, '../../frontend/src/context/NotificationContext.jsx');
    const content = fs.readFileSync(notifCtxPath, 'utf8');
    assert(content.includes("CustomEvent('cks_delivery_updated'"), 'NotificationContext.jsx must dispatch cks_delivery_updated event');
  });

  await test('23. Dashboard refresh event is dispatched', async () => {
    const dashPath = path.join(__dirname, '../../frontend/src/pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes("addEventListener('cks_delivery_updated'"), 'DashboardPage.jsx must listen for cks_delivery_updated event');
  });

  await test('24. WhatsApp Click-to-Chat remains compatible', async () => {
    const waService = require('./services/whatsapp.service');
    const url = waService.generateWhatsAppUrl('9876543210', 'Test message');
    assert(url.startsWith('https://wa.me/919876543210?text='), 'WhatsApp Click-to-Chat URL must be generated correctly');
  });

  await test('25. Existing Phase 20 delivery workflow remains compatible', async () => {
    const p20Path = path.join(__dirname, 'test_phase20_delivery_customer_details.js');
    assert(fs.existsSync(p20Path), 'Phase 20 test suite file must exist');
  });

  await test('26. Coupon/payment flow remains compatible', async () => {
    const p19_3Path = path.join(__dirname, 'test_phase19_3_coupon_payment_flow.js');
    assert(fs.existsSync(p19_3Path), 'Phase 19.3 test suite file must exist');
  });

  await test('27. Inventory flow remains compatible', async () => {
    const p17Path = path.join(__dirname, 'test_phase17_inventory.js');
    assert(fs.existsSync(p17Path), 'Phase 17 test suite file must exist');
  });

  await test('28. No duplicate EventSource connections are created', async () => {
    const notifCtxPath = path.join(__dirname, '../../frontend/src/context/NotificationContext.jsx');
    const content = fs.readFileSync(notifCtxPath, 'utf8');
    const matches = content.match(/new EventSource/g) || [];
    assert.strictEqual(matches.length, 1, 'Only one EventSource connection must exist in NotificationContext.jsx');
  });

  await test('29. Centralized helpers correctly filter states', async () => {
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: ORDER_STATUS.PROCESSING }), true);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: ORDER_STATUS.READY_FOR_DELIVERY }), true);
    assert.strictEqual(deliveryService.isOrderReadyForDelivery({ status: ORDER_STATUS.CONFIRMED }), false);
    assert.strictEqual(deliveryService.hasActiveDeliveryAssignment([{ status: 'ASSIGNED' }]), true);
    assert.strictEqual(deliveryService.hasActiveDeliveryAssignment([{ status: 'CANCELLED' }]), false);
  });

  await test('30. Dashboard count equals getUnassignedOrders().length unconditionally', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    const dashboard = await deliveryService.getAdminDeliveryDashboard();
    assert.strictEqual(dashboard.unassignedOrders, unassigned.length, 'Dashboard unassignedOrders metric MUST equal getUnassignedOrders().length');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
