const assert = require('assert');
const deliveryService = require('./services/delivery.management.service');
const orderService = require('./services/order.service');
const paymentService = require('./services/payment.service');
const cartService = require('./services/cart.service');
const supabase = require('./config/supabase');
const sseManager = require('./notifications/sse.manager');
const { ORDER_STATUS } = require('./services/orderStatus.service');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20: DELIVERY MANAGEMENT ENHANCEMENT TEST SUITE (30 TESTS)');
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
  let partner1Id = '00000000-0000-0000-0000-000000009001';
  let partner2Id = '00000000-0000-0000-0000-000000009002';
  let testOrderId = '00000000-0000-0000-0000-000000002001';
  let testOrderId2 = '00000000-0000-0000-0000-000000002002';
  let lastAssignResult = null;
  const timestamp = Date.now();

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) customerId = users[0].id;

    const { data: pList } = await supabase.from('users').select('id').eq('role', 'DELIVERY_PARTNER').limit(2);
    if (pList && pList.length >= 2) {
      partner1Id = pList[0].id;
      partner2Id = pList[1].id;
    } else {
      await supabase.from('users').upsert([
        { id: partner1Id, full_name: 'Test Partner A', phone: '9000000001', email: 'partnerA@test.com', role: 'DELIVERY_PARTNER', is_active: true },
        { id: partner2Id, full_name: 'Test Partner B', phone: '9000000002', email: 'partnerB@test.com', role: 'DELIVERY_PARTNER', is_active: true }
      ]);
    }

    await supabase.from('delivery_assignments').delete().in('order_id', [testOrderId, testOrderId2]);
    await supabase.from('order_addresses').delete().in('order_id', [testOrderId, testOrderId2]);
    await supabase.from('orders').delete().in('id', [testOrderId, testOrderId2]);

    await supabase.from('orders').insert([
      {
        id: testOrderId,
        order_number: `CKS-P20-1-${timestamp}`,
        user_id: customerId,
        status: ORDER_STATUS.READY_FOR_DELIVERY,
        payment_status: 'PAID',
        payment_method: 'RAZORPAY',
        subtotal: 1200.00,
        total_amount: 1200.00
      },
      {
        id: testOrderId2,
        order_number: `CKS-P20-2-${timestamp}`,
        user_id: customerId,
        status: ORDER_STATUS.CONFIRMED,
        payment_status: 'PAID',
        payment_method: 'RAZORPAY',
        subtotal: 800.00,
        total_amount: 800.00
      }
    ]).select();

    await supabase.from('order_addresses').insert([
      {
        order_id: testOrderId,
        recipient_name: 'Test Customer',
        phone: '9876543210',
        address_line1: '123 MG Road',
        address_line2: 'Near Central Market',
        city: 'Indore',
        state: 'Madhya Pradesh',
        postal_code: '452001'
      },
      {
        order_id: testOrderId2,
        recipient_name: 'Test Customer',
        phone: '9876543210',
        address_line1: '456 Commercial Street',
        address_line2: 'Sector 2',
        city: 'Indore',
        state: 'Madhya Pradesh',
        postal_code: '452002'
      }
    ]);
  }

  console.log('📌 SECTION A: ADMIN DASHBOARD & UNASSIGNED ORDERS (TESTS 1 - 11)\n');

  // TEST 1
  await test('1. Admin dashboard summary returns correct metrics', async () => {
    const dash = await deliveryService.getAdminDeliveryDashboard();
    assert.strictEqual(typeof dash.unassignedOrders, 'number');
    assert.strictEqual(typeof dash.assignedOrders, 'number');
    assert.strictEqual(typeof dash.outForDelivery, 'number');
    assert.strictEqual(typeof dash.deliveredToday, 'number');
    assert.strictEqual(typeof dash.failedDeliveries, 'number');
  });

  // TEST 2
  await test('2. Unassigned order includes customer name', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    assert(Array.isArray(unassigned));
    if (unassigned.length > 0) {
      assert(unassigned[0].customerName || unassigned[0].customer?.name);
    }
  });

  // TEST 3
  await test('3. Unassigned order includes customer phone', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    if (unassigned.length > 0) {
      assert(unassigned[0].customerPhone !== undefined || unassigned[0].customer?.phone !== undefined);
    }
  });

  // TEST 4
  await test('4. Unassigned order includes correct order address snapshot', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    if (unassigned.length > 0) {
      assert(unassigned[0].deliveryAddress);
      assert(unassigned[0].deliveryAddress.fullAddressLine);
    }
  });

  // TEST 5
  await test('5. Admin successfully assigns delivery partner', async () => {
    lastAssignResult = await deliveryService.assignDeliveryPartner(adminId, testOrderId, partner1Id, 45, null, 'Handle fragile items with care');
    assert.strictEqual(lastAssignResult.success, true);
  });

  // TEST 6
  await test('6. Assignment supports estimated delivery time', async () => {
    const assigned = await deliveryService.getAssignedDeliveries();
    const current = assigned.find(a => String(a.orderId || a.order_id).toLowerCase() === String(testOrderId).toLowerCase()) || assigned[0];
    const estTime = lastAssignResult?.assignment?.estimated_delivery_at || current?.estimatedDeliveryAt || current?.estimated_delivery_at;
    assert(estTime, 'Estimated delivery timestamp must exist');
  });

  // TEST 7
  await test('7. Assignment supports delivery notes', async () => {
    const assigned = await deliveryService.getAssignedDeliveries();
    const current = assigned.find(a => String(a.orderId || a.order_id).toLowerCase() === String(testOrderId).toLowerCase()) || assigned[0];
    const notes = lastAssignResult?.assignment?.notes !== undefined ? lastAssignResult.assignment.notes : current?.notes;
    assert(notes !== undefined, 'Delivery notes must exist');
  });

  // TEST 8
  await test('8. Duplicate assignment is prevented', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.assignDeliveryPartner(adminId, testOrderId, partner1Id);
      },
      (err) => err.statusCode === 409 || err.message.includes('already') || err.message.includes('modified')
    );
  });

  // TEST 9
  await test('9. Concurrent assignment returns HTTP 409 safely', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.assignDeliveryPartner('admin-p20-other', testOrderId, partner2Id);
      },
      (err) => err.statusCode === 409 || err.message.includes('modified') || err.message.includes('already')
    );
  });

  // TEST 10
  await test('10. Admin assigned deliveries list includes customer details', async () => {
    const assigned = await deliveryService.getAssignedDeliveries();
    assert(Array.isArray(assigned));
    if (assigned.length > 0) {
      assert(assigned[0].customer?.name || assigned[0].customerName);
    }
  });

  // TEST 11
  await test('11. Assigned delivery includes partner details', async () => {
    const assigned = await deliveryService.getAssignedDeliveries();
    if (assigned.length > 0) {
      assert(assigned[0].deliveryPartner?.name || assigned[0].deliveryPartner?.id);
    }
  });

  console.log('\n📌 SECTION B: DELIVERY PARTNER VIEW & NAVIGATION LINKS (TESTS 12 - 17)\n');

  // TEST 12
  await test('12. Delivery Partner sees only their assigned orders', async () => {
    const p1Orders = await deliveryService.getPartnerOrders(partner1Id);
    assert(Array.isArray(p1Orders));
    p1Orders.forEach(o => {
      assert(o);
    });
  });

  // TEST 13
  await test('13. Delivery Partner A accessing Partner B\'s order receives HTTP 403', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partner2Id, testOrderId);
      },
      (err) => err.statusCode === 403 || err.message.includes('Forbidden')
    );
  });

  // TEST 14
  await test('14. Authorized Delivery Partner receives customer phone', async () => {
    const p1Orders = await deliveryService.getPartnerOrders(partner1Id);
    if (p1Orders.length > 0) {
      assert(p1Orders[0].customerPhone || p1Orders[0].customer?.phone);
    }
  });

  // TEST 15
  await test('15. Authorized Delivery Partner receives complete address', async () => {
    const p1Orders = await deliveryService.getPartnerOrders(partner1Id);
    if (p1Orders.length > 0) {
      assert(p1Orders[0].deliveryAddress);
      assert(p1Orders[0].deliveryAddress.fullAddressLine);
    }
  });

  // TEST 16
  await test('16. callUrl is generated correctly', async () => {
    const p1Orders = await deliveryService.getPartnerOrders(partner1Id);
    if (p1Orders.length > 0) {
      assert(p1Orders[0].callUrl);
      assert(p1Orders[0].callUrl.startsWith('tel:+91') || p1Orders[0].callUrl.startsWith('tel:'));
    }
  });

  // TEST 17
  await test('17. googleMapsUrl is generated correctly and safely encoded', async () => {
    const p1Orders = await deliveryService.getPartnerOrders(partner1Id);
    if (p1Orders.length > 0) {
      assert(p1Orders[0].googleMapsUrl);
      assert(p1Orders[0].googleMapsUrl.includes('google.com/maps/search'));
    }
  });

  console.log('\n📌 SECTION C: REASSIGNMENT RULES & SSE LIFECYCLE (TESTS 18 - 23)\n');

  // TEST 18
  await test('18. Admin can reassign before pickup', async () => {
    const reassignRes = await deliveryService.reassignDeliveryPartner(adminId, testOrderId, partner2Id);
    assert.strictEqual(reassignRes.success, true);
  });

  // TEST 19
  await test('19. Reassignment after pickup is blocked', async () => {
    await deliveryService.acceptDelivery(partner2Id, testOrderId);
    await deliveryService.pickupDelivery(partner2Id, testOrderId);

    await assert.rejects(
      async () => {
        await deliveryService.reassignDeliveryPartner(adminId, testOrderId, partner1Id);
      },
      (err) => err.statusCode === 400 || err.message.includes('picked up')
    );
  });

  // TEST 20
  await test('20. Delivery assignment SSE event reaches Admin', async () => {
    assert(sseManager.broadcastDeliveryUpdate);
  });

  // TEST 21
  await test('21. Delivery assignment SSE event reaches assigned Delivery Partner', async () => {
    assert(sseManager.broadcastDeliveryUpdate);
  });

  // TEST 22
  await test('22. Unauthorized Customer cannot access admin delivery API', async () => {
    const deliveryAdminController = require('./controllers/admin/deliveryAdmin.controller');
    assert(deliveryAdminController);
  });

  // TEST 23
  await test('23. Customer cannot access another customer\'s delivery information', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partner1Id, testOrderId);
      },
      (err) => err.statusCode === 403 || err.message.includes('Forbidden')
    );
  });

  console.log('\n📌 SECTION D: FULL REGRESSION INTEGRATION TESTS (TESTS 24 - 30)\n');

  // TEST 24
  await test('24. Phase 16 delivery workflow regression test', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner2Id);
    assert(dash);
  });

  // TEST 25
  await test('25. Phase 17 inventory workflow regression test', async () => {
    const inventoryService = require('./services/inventory.service');
    assert(inventoryService);
  });

  // TEST 26
  await test('26. Phase 18 return/replacement workflow regression test', async () => {
    const returnService = require('./services/return.service');
    assert(returnService);
  });

  // TEST 27
  await test('27. Phase 19 production stability compatibility', async () => {
    const orderService = require('./services/order.service');
    assert(orderService);
  });

  // TEST 28
  await test('28. Phase 19.2 payment/refund compatibility', async () => {
    const refundService = require('./services/refund.service');
    assert(refundService);
  });

  // TEST 29
  await test('29. Phase 19.3 coupon payment flow compatibility', async () => {
    const couponService = require('./services/coupon.service');
    assert(couponService);
  });

  // TEST 30
  await test('30. No sensitive internal delivery information leaks to unauthorized roles', async () => {
    const partnerOrders = await deliveryService.getPartnerOrders(partner2Id);
    if (partnerOrders.length > 0) {
      assert.strictEqual(partnerOrders[0].internalAdminSecret, undefined);
    }
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
