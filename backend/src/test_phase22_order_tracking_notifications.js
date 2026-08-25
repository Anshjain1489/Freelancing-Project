const orderTrackingService = require('./services/orderTracking.service');
const AppError = require('./utils/AppError');

async function runPhase22Tests() {
  console.log('=== PHASE 22: REAL-TIME ORDER TRACKING & NOTIFICATIONS TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${message}`);
      failed++;
    }
  }

  const testOrderId = `test_ord_${Date.now()}`;
  const customerId = `cust_${Date.now()}`;
  const otherCustomerId = `cust_other_${Date.now()}`;

  try {
    // Test 1: Record initial order creation status change
    console.log('[TEST 1] Recording Order Creation History');
    const rec1 = await orderTrackingService.recordStatusChange({
      orderId: testOrderId,
      previousStatus: null,
      newStatus: 'CONFIRMED',
      changedBy: customerId,
      changedByRole: 'CUSTOMER',
      reason: 'Order placed by customer',
      metadata: { eventType: 'ORDER_CREATED', paymentMethod: 'COD', secretToken: 'SUPER_SECRET' }
    });

    assert(rec1 !== null, 'Status change recorded successfully');
    assert(rec1.new_status === 'CONFIRMED', 'New status is CONFIRMED');
    assert(rec1.metadata?.secretToken === undefined, 'Sensitive metadata (secretToken) sanitized');

    // Test 2: Idempotency & Deduplication Guard
    console.log('\n[TEST 2] Idempotency & Consecutive Duplicate Prevention');
    const rec2 = await orderTrackingService.recordStatusChange({
      orderId: testOrderId,
      previousStatus: 'CONFIRMED',
      newStatus: 'CONFIRMED',
      changedBy: customerId,
      changedByRole: 'CUSTOMER',
      reason: 'Duplicate payload retry',
      metadata: { eventType: 'ORDER_CREATED' }
    });

    assert(rec2 !== null, 'Duplicate status change call handled cleanly without error');

    // Test 3: Record Admin Approval
    console.log('\n[TEST 3] Admin Acceptance Transition');
    const rec3 = await orderTrackingService.recordStatusChange({
      orderId: testOrderId,
      previousStatus: 'CONFIRMED',
      newStatus: 'PROCESSING',
      changedBy: 'admin_1',
      changedByRole: 'ADMIN',
      reason: 'Store admin accepted COD order',
      metadata: { eventType: 'ORDER_ACCEPTED' }
    });
    assert(rec3.new_status === 'PROCESSING', 'Recorded status change to PROCESSING');

    // Test 4: Retrieve Tracking Timeline (Admin Role)
    console.log('\n[TEST 4] Get Tracking History (Admin Inspection)');
    const history = await orderTrackingService.getOrderTrackingHistory(testOrderId);
    assert(Array.isArray(history), 'History is an array');
    assert(history.length >= 2, 'History contains chronological entries');

    // Test 5: Customer Timeline Computation Security & Sanitization
    console.log('\n[TEST 5] Customer Timeline & Security Authorization Checks');
    try {
      await orderTrackingService.getCustomerOrderTracking(otherCustomerId, 'CUSTOMER', testOrderId);
      assert(false, 'Unauthorized customer access should throw 403 Forbidden');
    } catch (err) {
      assert(err.statusCode === 403, 'Unauthorized customer blocked with 403 Forbidden');
    }

    console.log('\n=== PHASE 22 TEST SUMMARY ===');
    console.log(`Total Passed: ${passed}`);
    console.log(`Total Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNHANDLED_TEST_ERROR]', err);
    process.exit(1);
  }
}

runPhase22Tests();
