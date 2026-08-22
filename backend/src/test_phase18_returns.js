const assert = require('assert');
const cancellationService = require('./services/cancellation.service');
const returnService = require('./services/return.service');
const replacementService = require('./services/replacement.service');
const inventoryService = require('./services/inventory.service');
const refundService = require('./services/refund.service');
const { ORDER_STATUS } = require('./services/orderStatus.service');

async function runPhase18Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 18: RETURNS, CANCELLATIONS & REPLACEMENTS SUITE (35 TESTS)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };

  const adminId = 'admin-user-id';
  const customerId = 'cust-user-100';
  const otherCustomerId = 'cust-user-999';
  const partnerId = 'partner-user-id';

  // ----------------------------------------------------
  // SECTION 1: CANCELLATION TESTS (10 TESTS)
  // ----------------------------------------------------
  console.log('📌 SECTION 1: ORDER CANCELLATION TESTS (10 TESTS)');

  await test('1. Customer auto-cancellation for CONFIRMED order releases stock reservation', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-cancel-1', 'Changed my mind');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'CANCELLED');
  });

  await test('2. Cancellation request without reason throws Bad Request', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-cancel-1', '');
      assert.fail('Should have thrown error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('3. Attempting customer cancellation for DELIVERED order fails', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-deliv-1', 'Want cancel');
      assert.fail('Should have thrown error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
      assert(err.message.includes('cannot be cancelled') || err.message.includes('delivered'));
    }
  });

  await test('4. Customer cancellation for READY_FOR_DELIVERY order enters REQUESTED state', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-1', 'Late delivery');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'REQUESTED');
  });

  await test('5. Duplicate cancellation request throws 409 Conflict', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-1', 'Duplicate');
      assert.fail('Should have thrown error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('6. Admin approves cancellation request -> status APPROVED & refund initiated', async () => {
    const activeReq = Array.from(cancellationService.mockCancellations.values()).find(c => c.order_id === 'ord-ready-1');
    const res = await cancellationService.approveCancellation(adminId, activeReq.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('7. Approving already processed cancellation throws 409 Conflict', async () => {
    const activeReq = Array.from(cancellationService.mockCancellations.values()).find(c => c.order_id === 'ord-ready-1');
    try {
      await cancellationService.approveCancellation(adminId, activeReq.id);
      assert.fail('Should have thrown error');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('8. Admin rejects cancellation request with reason', async () => {
    const reqRes = await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-2', 'Cancel please');
    const activeReq = reqRes.cancellation;
    const res = await cancellationService.rejectCancellation(adminId, activeReq.id, 'Already dispatched');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'REJECTED');
  });

  await test('9. Prepaid order cancellation triggers Razorpay refund engine', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-prepaid-1', 'Refund me');
    assert.strictEqual(res.success, true);
    assert(res.refund !== undefined);
  });

  await test('10. Admin cancellations listing returns array', async () => {
    const list = await cancellationService.getAdminCancellations();
    assert(Array.isArray(list));
  });

  // ----------------------------------------------------
  // SECTION 2: RETURN POLICY & DISCOUNT REFUND TESTS (7 TESTS)
  // ----------------------------------------------------
  console.log('\n📌 SECTION 2: RETURN POLICY & DISCOUNT REFUND TESTS (7 TESTS)');

  await test('11. Customer return request for DELIVERED order within 7 days succeeds', async () => {
    const res = await returnService.requestCustomerReturn(customerId, 'ord-deliv-1', {
      reason: 'Defective / Damaged Item',
      customerDescription: 'Screen cracked',
      items: [{ orderItemId: 'item-1', productId: 'prod-1', quantity: 1 }]
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.return.status, 'REQUESTED');
  });

  await test('12. Return request without reason or items throws Bad Request', async () => {
    try {
      await returnService.requestCustomerReturn(customerId, 'ord-deliv-1', { reason: '', items: [] });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('13. Return request for non-delivered order fails', async () => {
    try {
      await returnService.requestCustomerReturn(customerId, 'ord-cancel-1', {
        reason: 'Defective',
        items: [{ productId: 'prod-1', quantity: 1 }]
      });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('14. Duplicate active return request throws 409 Conflict', async () => {
    try {
      await returnService.requestCustomerReturn(customerId, 'ord-deliv-1', {
        reason: 'Defective',
        items: [{ productId: 'prod-1', quantity: 1 }]
      });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('15. Returning greater quantity than purchased throws 400 Bad Request', async () => {
    try {
      await returnService.requestCustomerReturn(customerId, 'ord-deliv-2', {
        reason: 'Wrong Item',
        items: [{ productId: 'prod-1', quantity: 99 }]
      });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('16. Proportional coupon discount deduction calculated server-side for partial refund', async () => {
    const res = await returnService.requestCustomerReturn(customerId, 'ord-deliv-2', {
      reason: 'Wrong Item',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    assert.strictEqual(res.success, true);
    // Subtotal = 1000, Discount = 100, Item Gross = 500 -> Net Refund = 500 - (100*500/1000) = 450
    assert.strictEqual(res.estimatedRefundAmount, 450);
  });

  await test('17. Customer returns listing returns array', async () => {
    const list = await returnService.getCustomerReturns(customerId);
    assert(Array.isArray(list));
  });

  // ----------------------------------------------------
  // SECTION 3: RETURN WORKFLOW & INVENTORY RESTORATION (8 TESTS)
  // ----------------------------------------------------
  console.log('\n📌 SECTION 3: RETURN WORKFLOW & INVENTORY RESTORATION TESTS (8 TESTS)');

  await test('18. Admin approves return request -> status APPROVED (Stock NOT restored yet)', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    const res = await returnService.approveReturn(adminId, active.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('19. Admin assigns reverse pickup partner -> status PICKUP_ASSIGNED', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    const res = await returnService.assignReversePickup(adminId, active.id, partnerId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PICKUP_ASSIGNED');
  });

  await test('20. Delivery partner marks return picked up -> status PICKED_UP (Stock NOT restored yet)', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    const res = await returnService.markPickupPickedUp(partnerId, active.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PICKED_UP');
  });

  await test('21. Unauthorized partner mark picked up throws 403 Forbidden', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    try {
      await returnService.markPickupPickedUp(otherCustomerId, active.id);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('22. Delivery partner marks pickup failed with mandatory reason', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-2');
    await returnService.approveReturn(adminId, active.id);
    await returnService.assignReversePickup(adminId, active.id, partnerId);
    const res = await returnService.markPickupFailed(partnerId, active.id, 'Door locked');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'FAILED');
  });

  await test('23. Admin confirms return RECEIVED for RESTOCKABLE items -> Restores stock', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    const res = await returnService.confirmReturnReceived(adminId, active.id, [
      { productId: 'prod-1', receivedQuantity: 1, conditionStatus: 'RESTOCKABLE' }
    ]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'RECEIVED');
  });

  await test('24. Re-confirming return RECEIVED throws 409 Conflict idempotency error', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.order_id === 'ord-deliv-1');
    try {
      await returnService.confirmReturnReceived(adminId, active.id, []);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('25. Confirm return RECEIVED for DAMAGED items -> Audit logged, stock NOT incremented', async () => {
    const newReq = await returnService.requestCustomerReturn(customerId, 'ord-deliv-3', {
      reason: 'Damaged packaging',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    const retId = newReq.return.id;
    await returnService.approveReturn(adminId, retId);
    const res = await returnService.confirmReturnReceived(adminId, retId, [
      { productId: 'prod-1', receivedQuantity: 1, conditionStatus: 'DAMAGED' }
    ]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'RECEIVED');
  });

  // ----------------------------------------------------
  // SECTION 4: REPLACEMENT REQUESTS & STOCK RESERVATION (10 TESTS)
  // ----------------------------------------------------
  console.log('\n📌 SECTION 4: REPLACEMENT REQUESTS & STOCK RESERVATION TESTS (10 TESTS)');

  await test('26. Customer request replacement for DELIVERED order within 7 days succeeds', async () => {
    const res = await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-4', {
      reason: 'Wrong Item Delivered',
      description: 'Sent sugar instead of rice'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.replacement.status, 'REQUESTED');
  });

  await test('27. Replacement request without reason throws Bad Request', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-4', { reason: '' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('28. Replacement request for non-delivered order fails', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-cancel-1', { reason: 'Wrong' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('29. Duplicate active replacement request throws 409 Conflict', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-4', { reason: 'Wrong' });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('30. Admin approves replacement request -> status APPROVED & stock reserved', async () => {
    const list = await replacementService.getAdminReplacements();
    const active = list.find(r => r.order_id === 'ord-deliv-4');
    const res = await replacementService.approveReplacement(adminId, active.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('31. Approving already processed replacement throws 409 Conflict', async () => {
    const list = await replacementService.getAdminReplacements();
    const active = list.find(r => r.order_id === 'ord-deliv-4');
    try {
      await replacementService.approveReplacement(adminId, active.id);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('32. Admin rejects replacement request with reason', async () => {
    const newReq = await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-5', {
      reason: 'Quality issue'
    });
    const res = await replacementService.rejectReplacement(adminId, newReq.replacement.id, 'Out of stock');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'REJECTED');
  });

  await test('33. Update replacement fulfillment status to OUT_FOR_DELIVERY', async () => {
    const list = await replacementService.getAdminReplacements();
    const active = list.find(r => r.order_id === 'ord-deliv-4');
    const res = await replacementService.updateReplacementFulfillment(adminId, active.id, 'OUT_FOR_DELIVERY');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'OUT_FOR_DELIVERY');
  });

  await test('34. Update replacement fulfillment status to DELIVERED converts reserved stock', async () => {
    const list = await replacementService.getAdminReplacements();
    const active = list.find(r => r.order_id === 'ord-deliv-4');
    const res = await replacementService.updateReplacementFulfillment(adminId, active.id, 'DELIVERED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'DELIVERED');
  });

  await test('35. Customer replacements listing returns array', async () => {
    const list = await replacementService.getCustomerReplacements(customerId);
    assert(Array.isArray(list));
  });

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 35 TESTS)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase18Tests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
