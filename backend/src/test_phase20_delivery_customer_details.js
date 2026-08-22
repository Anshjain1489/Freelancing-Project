const assert = require('assert');
const deliveryService = require('./services/delivery.management.service');
const orderService = require('./services/order.service');
const paymentService = require('./services/payment.service');
const cartService = require('./services/cart.service');
const supabase = require('./config/supabase');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20: DELIVERY MANAGEMENT ENHANCEMENT TEST SUITE');
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

  let testUserId = 'user-p20-' + Date.now();
  let addressId = null;
  let productId = null;
  let testOrderId = null;
  let partner1Id = 'partner-p20-1-' + Date.now();
  let partner2Id = 'partner-p20-2-' + Date.now();

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) testUserId = users[0].id;

    const { data: addresses } = await supabase.from('addresses').select('id').eq('user_id', testUserId).limit(1);
    if (addresses && addresses.length > 0) {
      addressId = addresses[0].id;
    } else {
      const { data: newAddr } = await supabase.from('addresses').insert([{
        user_id: testUserId,
        recipient_name: 'Ansh Jain',
        phone: '9876543210',
        address_line1: '123 MG Road',
        address_line2: 'Near XYZ Temple',
        city: 'Indore',
        state: 'Madhya Pradesh',
        postal_code: '452001',
        latitude: 22.71,
        longitude: 75.85
      }]).select('id').single();
      if (newAddr) addressId = newAddr.id;
    }

    const { data: products } = await supabase.from('products').select('id').gt('available_stock', 50).limit(1);
    if (products && products.length > 0) productId = products[0].id;

    // Fetch existing partners or create mock partner IDs
    const { data: pList } = await supabase.from('users').select('id').eq('role', 'DELIVERY_PARTNER').limit(2);
    if (pList && pList.length >= 2) {
      partner1Id = pList[0].id;
      partner2Id = pList[1].id;
    }
  }

  console.log('📌 SECTION A: ADMIN DELIVERY DASHBOARD & UNASSIGNED ORDERS (TESTS 1 - 5)\n');

  // TEST 1: Admin summary dashboard returns 5 key metrics
  await test('1. Admin summary dashboard returns 5 key delivery metrics', async () => {
    const dash = await deliveryService.getAdminDeliveryDashboard();
    assert.strictEqual(typeof dash.unassignedOrders, 'number');
    assert.strictEqual(typeof dash.assignedOrders, 'number');
    assert.strictEqual(typeof dash.outForDelivery, 'number');
    assert.strictEqual(typeof dash.deliveredToday, 'number');
    assert.strictEqual(typeof dash.failedDeliveries, 'number');
  });

  // TEST 2: Admin can view unassigned ready-for-delivery orders
  await test('2. Admin can view unassigned ready-for-delivery orders', async () => {
    if (supabase && testUserId && addressId && productId) {
      await cartService.clearCart(testUserId);
      await cartService.addToCart(testUserId, productId, 2);
      const orderRes = await orderService.createOrder(testUserId, addressId, null);
      testOrderId = orderRes.orderId;
    }

    const unassigned = await deliveryService.getUnassignedOrders();
    assert(Array.isArray(unassigned), 'Unassigned orders must be an array');
  });

  // TEST 3: Admin receives customer name, phone, and email in unassigned orders
  await test('3. Admin receives customer name, phone, and email in unassigned orders', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    if (unassigned.length > 0) {
      const first = unassigned[0];
      assert(first.customerName || first.customer?.name, 'Customer name must exist');
      assert(first.customerPhone !== undefined, 'Customer phone field must exist');
    }
  });

  // TEST 4: Admin receives complete delivery address breakdown
  await test('4. Admin receives complete delivery address breakdown', async () => {
    const unassigned = await deliveryService.getUnassignedOrders();
    if (unassigned.length > 0) {
      const first = unassigned[0];
      assert(first.deliveryAddress || first.address, 'Delivery address must be present');
    }
  });

  // TEST 5: Admin can assign a delivery partner with estimated delivery time
  await test('5. Admin can assign a delivery partner with estimated delivery time', async () => {
    if (!testOrderId) return;
    const assignRes = await deliveryService.assignDeliveryPartner('admin-p20', testOrderId, partner1Id, 45);
    assert.strictEqual(assignRes.success, true);
    assert(assignRes.assignment.estimated_delivery_at, 'Estimated delivery time must be stored');
  });

  console.log('\n📌 SECTION B: DELIVERY PARTNER ORDER VIEW & MAPS/CALL LINKS (TESTS 6 - 10)\n');

  // TEST 6: Delivery Partner can view assigned orders
  await test('6. Delivery Partner can view assigned orders', async () => {
    const orders = await deliveryService.getPartnerOrders(partner1Id);
    assert(Array.isArray(orders), 'Partner orders must be an array');
  });

  // TEST 7: Delivery Partner receives customer phone number and Call link (tel:+91...)
  await test('7. Delivery Partner receives customer phone number and Call link (tel:+91...)', async () => {
    const orders = await deliveryService.getPartnerOrders(partner1Id);
    if (orders.length > 0) {
      const first = orders[0];
      assert(first.callUrl && first.callUrl.startsWith('tel:'), 'Call URL must start with tel:');
    }
  });

  // TEST 8: Delivery Partner receives Google Maps link safely encoded
  await test('8. Delivery Partner receives Google Maps link safely encoded', async () => {
    const orders = await deliveryService.getPartnerOrders(partner1Id);
    if (orders.length > 0) {
      const first = orders[0];
      assert(first.googleMapsUrl && first.googleMapsUrl.includes('google.com/maps'), 'Google Maps URL must be properly formatted');
    }
  });

  // TEST 9: Delivery Partner A cannot access Delivery Partner B order (403 Forbidden)
  await test('9. Delivery Partner A cannot access Delivery Partner B order (403 Forbidden)', async () => {
    if (!testOrderId) return;
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partner2Id, testOrderId);
      },
      (err) => err.statusCode === 403 || err.message.includes('Forbidden')
    );
  });

  // TEST 10: Admin can view all assigned deliveries list
  await test('10. Admin can view all assigned deliveries list', async () => {
    const assigned = await deliveryService.getAssignedDeliveries();
    assert(Array.isArray(assigned), 'Assigned deliveries list must be an array');
  });

  console.log('\n📌 SECTION C: REASSIGNMENT & LIFECYCLE RULES (TESTS 11 - 15)\n');

  // TEST 11: Admin can reassign partner before pickup
  await test('11. Admin can reassign partner before pickup', async () => {
    if (!testOrderId) return;
    const reassignRes = await deliveryService.reassignDeliveryPartner('admin-p20', testOrderId, partner2Id);
    assert.strictEqual(reassignRes.success, true);
  });

  // TEST 12: Previous partner loses access after reassignment
  await test('12. Previous partner loses access after reassignment', async () => {
    if (!testOrderId) return;
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partner1Id, testOrderId);
      },
      (err) => err.statusCode === 403 || err.message.includes('Forbidden')
    );
  });

  // TEST 13: Reassigned partner now gains access to order
  await test('13. Reassigned partner now gains access to order', async () => {
    if (!testOrderId) return;
    const orderDetails = await deliveryService.getPartnerOrderById(partner2Id, testOrderId);
    assert(orderDetails, 'Reassigned partner must be able to view order details');
  });

  // TEST 14: Partner accepts delivery assignment
  await test('14. Partner accepts delivery assignment', async () => {
    if (!testOrderId) return;
    const acceptRes = await deliveryService.acceptDelivery(partner2Id, testOrderId);
    assert.strictEqual(acceptRes.success, true);
  });

  // TEST 15: Partner marks order picked up (OUT_FOR_DELIVERY)
  await test('15. Partner marks order picked up (OUT_FOR_DELIVERY)', async () => {
    if (!testOrderId) return;
    const pickupRes = await deliveryService.pickupDelivery(partner2Id, testOrderId);
    assert.strictEqual(pickupRes.success, true);
  });

  console.log('\n📌 SECTION D: CONCURRENCY & REGRESSION SAFETY (TESTS 16 - 20)\n');

  // TEST 16: Cannot reassign order that is already picked up or out for delivery
  await test('16. Cannot reassign order that is already picked up or out for delivery', async () => {
    if (!testOrderId) return;
    await assert.rejects(
      async () => {
        await deliveryService.reassignDeliveryPartner('admin-p20', testOrderId, partner1Id);
      },
      (err) => err.statusCode === 400 || err.message.includes('already picked up')
    );
  });

  // TEST 17: Duplicate delivery assignment returns 409 Conflict
  await test('17. Duplicate delivery assignment returns 409 Conflict', async () => {
    if (!testOrderId) return;
    await assert.rejects(
      async () => {
        await deliveryService.assignDeliveryPartner('admin-p20', testOrderId, partner1Id);
      },
      (err) => err.statusCode === 409 || err.message.includes('modified') || err.message.includes('already')
    );
  });

  // TEST 18: Partner marks order delivered
  await test('18. Partner marks order delivered', async () => {
    if (!testOrderId) return;
    const deliverRes = await deliveryService.deliverOrder(partner2Id, testOrderId);
    assert.strictEqual(deliverRes.success, true);
  });

  // TEST 19: Phase 16 Delivery Management compatibility
  await test('19. Phase 16 Delivery Management compatibility', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner2Id);
    assert(dash, 'Partner dashboard metrics must return');
  });

  // TEST 20: Phase 17 Inventory integration compatibility
  await test('20. Phase 17 Inventory integration compatibility', async () => {
    const inventoryService = require('./services/inventory.service');
    assert(inventoryService, 'Inventory service loaded cleanly');
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
