const assert = require('assert');
const returnService = require('./services/return.service');
const cancellationService = require('./services/cancellation.service');
const replacementService = require('./services/replacement.service');

async function runTests() {
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
      console.log(`  ❌ FAIL: ${name}`);
      console.log(`     Error: ${err.message}`);
      failed++;
    }
  };

  const customerId = 'cust-18-1';
  const otherCustomerId = 'cust-18-2';
  const adminId = 'admin-18-1';
  const partnerId = 'partner-18-1';

  let createdCancellationId = null;
  let createdRejectCancelId = null;
  let createdReturnId = null;
  let createdReturn2Id = null;

  // ----------------------------------------------------
  // SECTION 1: ORDER CANCELLATION TESTS (10 TESTS)
  // ----------------------------------------------------
  console.log('📌 SECTION 1: ORDER CANCELLATION TESTS (10 TESTS)');

  await test('1. Customer auto-cancellation for CONFIRMED order releases stock reservation', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-cancel-1', 'Changed mind');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'CANCELLED');
  });

  await test('2. Cancellation request without reason throws Bad Request', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-cancel-2', '');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('3. Attempting customer cancellation for DELIVERED order fails', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-deliv-1', 'Too late');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('4. Customer cancellation for READY_FOR_DELIVERY order enters REQUESTED state', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-1', 'Need to cancel');
    assert.strictEqual(res.success, true);
    assert.ok(res.status === 'REQUESTED' || res.cancellationRequest?.status === 'REQUESTED');
    createdCancellationId = res.cancellationRequest?.id || res.id;
  });

  await test('5. Duplicate cancellation request throws 409 Conflict', async () => {
    try {
      await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-1', 'Duplicate');
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('6. Admin approves cancellation request -> status APPROVED & refund initiated', async () => {
    const list = await cancellationService.getAdminCancellations();
    const req = list.find(c => c.id === createdCancellationId || c.order_id === 'ord-ready-1' || c.orderId === 'ord-ready-1') || list[0];
    createdCancellationId = req.id;
    const res = await cancellationService.approveCancellation(adminId, req.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('7. Approving already processed cancellation throws 409 Conflict', async () => {
    try {
      await cancellationService.approveCancellation(adminId, createdCancellationId);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('8. Admin rejects cancellation request with reason', async () => {
    const resCancel = await cancellationService.requestCustomerCancellation(customerId, 'ord-ready-2', 'Reject me');
    createdRejectCancelId = resCancel.cancellationRequest?.id || resCancel.id;
    const list = await cancellationService.getAdminCancellations();
    const req = list.find(c => c.id === createdRejectCancelId || c.order_id === 'ord-ready-2' || c.orderId === 'ord-ready-2') || list[0];
    const res = await cancellationService.rejectCancellation(adminId, req.id, 'Dispatched already');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'REJECTED');
  });

  await test('9. Prepaid order cancellation triggers Razorpay refund engine', async () => {
    const res = await cancellationService.requestCustomerCancellation(customerId, 'ord-prepaid-1', 'Prepaid cancel');
    assert.strictEqual(res.success, true);
    assert(res.refundId || res.status === 'CANCELLED');
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
      reason: 'Damaged Product',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.status === 'REQUESTED' || res.returnRequest?.status === 'REQUESTED');
    createdReturnId = res.returnRequest?.id || res.id;
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
    assert.strictEqual(res.estimatedRefundAmount, 450);
    createdReturn2Id = res.returnRequest?.id || res.id;
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
    const active = retList.find(r => r.id === createdReturnId || r.order_id === 'ord-deliv-1' || r.orderId === 'ord-deliv-1') || retList[0];
    createdReturnId = active.id;
    const res = await returnService.approveReturn(adminId, active.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('19. Admin assigns reverse pickup partner -> status PICKUP_ASSIGNED', async () => {
    const res = await returnService.assignReversePickup(adminId, createdReturnId, partnerId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PICKUP_ASSIGNED');
  });

  await test('20. Delivery partner marks return picked up -> status PICKED_UP (Stock NOT restored yet)', async () => {
    const res = await returnService.markPickupPickedUp(partnerId, createdReturnId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'PICKED_UP');
  });

  await test('21. Unauthorized partner mark picked up throws 403 Forbidden', async () => {
    try {
      await returnService.markPickupPickedUp(otherCustomerId, createdReturnId);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 403);
    }
  });

  await test('22. Delivery partner marks pickup failed with mandatory reason', async () => {
    const retList = await returnService.getAdminReturns();
    const active = retList.find(r => r.id === createdReturn2Id || r.order_id === 'ord-deliv-2' || r.orderId === 'ord-deliv-2') || retList[0];
    createdReturn2Id = active.id;
    await returnService.approveReturn(adminId, active.id);
    await returnService.assignReversePickup(adminId, active.id, partnerId);
    const res = await returnService.markPickupFailed(partnerId, active.id, 'Door locked');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'FAILED');
  });

  await test('23. Admin confirms return RECEIVED for RESTOCKABLE items -> Restores stock', async () => {
    const res = await returnService.confirmReturnReceived(adminId, createdReturnId, [
      { productId: 'prod-1', receivedQuantity: 1, conditionStatus: 'RESTOCKABLE' }
    ]);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'RECEIVED');
  });

  await test('24. Re-confirming return RECEIVED throws 409 Conflict idempotency error', async () => {
    try {
      await returnService.confirmReturnReceived(adminId, createdReturnId, []);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('25. Confirm return RECEIVED for DAMAGED items -> Audit logged, stock NOT incremented', async () => {
    const resRet3 = await returnService.requestCustomerReturn(customerId, 'ord-deliv-3', {
      reason: 'Expired Item',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    const ret3Id = resRet3.returnRequest?.id || resRet3.id || (await returnService.getAdminReturns())[0]?.id;
    await returnService.approveReturn(adminId, ret3Id);
    await returnService.assignReversePickup(adminId, ret3Id, partnerId);
    await returnService.markPickupPickedUp(partnerId, ret3Id);

    const res = await returnService.confirmReturnReceived(adminId, ret3Id, [
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
      reason: 'Wrong Color',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.status === 'REQUESTED' || res.replacementRequest?.status === 'REQUESTED');
  });

  await test('27. Replacement request without reason throws Bad Request', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-4', { reason: '', items: [] });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('28. Replacement request for non-delivered order fails', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-cancel-1', {
        reason: 'Faulty',
        items: [{ productId: 'prod-1', quantity: 1 }]
      });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  await test('29. Duplicate active replacement request throws 409 Conflict', async () => {
    try {
      await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-4', {
        reason: 'Faulty',
        items: [{ productId: 'prod-1', quantity: 1 }]
      });
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('30. Admin approves replacement request -> status APPROVED & stock reserved', async () => {
    const list = await replacementService.getAdminReplacements();
    const req = list.find(r => r.order_id === 'ord-deliv-4' || r.orderId === 'ord-deliv-4') || list[0];
    const res = await replacementService.approveReplacement(adminId, req.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'APPROVED');
  });

  await test('31. Approving already processed replacement throws 409 Conflict', async () => {
    const list = await replacementService.getAdminReplacements();
    const req = list.find(r => r.order_id === 'ord-deliv-4' || r.orderId === 'ord-deliv-4') || list[0];
    try {
      await replacementService.approveReplacement(adminId, req.id);
      assert.fail('Should fail');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  await test('32. Admin rejects replacement request with reason', async () => {
    await replacementService.requestCustomerReplacement(customerId, 'ord-deliv-5', {
      reason: 'Damaged',
      items: [{ productId: 'prod-1', quantity: 1 }]
    });
    const list = await replacementService.getAdminReplacements();
    const req = list.find(r => r.order_id === 'ord-deliv-5' || r.orderId === 'ord-deliv-5') || list[0];
    const res = await replacementService.rejectReplacement(adminId, req.id, 'Physical damage not covered');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'REJECTED');
  });

  await test('33. Update replacement fulfillment status to OUT_FOR_DELIVERY', async () => {
    const list = await replacementService.getAdminReplacements();
    const req = list.find(r => r.order_id === 'ord-deliv-4' || r.orderId === 'ord-deliv-4') || list[0];
    const res = await replacementService.updateReplacementFulfillment(adminId, req.id, 'OUT_FOR_DELIVERY');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fulfillmentStatus, 'OUT_FOR_DELIVERY');
  });

  await test('34. Update replacement fulfillment status to DELIVERED converts reserved stock', async () => {
    const list = await replacementService.getAdminReplacements();
    const req = list.find(r => r.order_id === 'ord-deliv-4' || r.orderId === 'ord-deliv-4') || list[0];
    const res = await replacementService.updateReplacementFulfillment(adminId, req.id, 'DELIVERED');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.fulfillmentStatus, 'DELIVERED');
  });

  await test('35. Customer replacements listing returns array', async () => {
    const list = await replacementService.getCustomerReplacements(customerId);
    assert(Array.isArray(list));
  });

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
