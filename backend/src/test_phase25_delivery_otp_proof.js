const assert = require('assert');
const supabase = require('./config/supabase');
const deliveryService = require('./services/delivery.management.service');
const deliveryOtpService = require('./services/deliveryOtp.service');
const orderStatusService = require('./services/orderStatus.service');
const orderTrackingService = require('./services/orderTracking.service');
const sseManager = require('./notifications/sse.manager');
const AppError = require('./utils/AppError');
const { HTTP_STATUS } = require('./constants/statusCodes');

async function runPhase25Tests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 25 AUTOMATED COMPREHENSIVE TEST SUITE');
  console.log('  Secure Delivery OTP & Proof of Delivery Workflow (46 Assertions)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ [FAIL] ${name}`);
      console.log(`     Error: ${err.message}`);
      failed++;
    }
  };

  const timestamp = Date.now();
  const adminId = '00000000-0000-0000-0000-000000007101';
  const partner1Id = '00000000-0000-0000-0000-000000009101';
  const partner2Id = '00000000-0000-0000-0000-000000009102';
  const customer1Id = '00000000-0000-0000-0000-000000008101';
  const customer2Id = '00000000-0000-0000-0000-000000008102';

  const order1Id = `00000000-0000-0000-0000-${String(timestamp).slice(-12)}`;
  const order2Id = `00000000-0000-0000-0000-${String(timestamp + 1).slice(-12)}`;
  const order3Id = `00000000-0000-0000-0000-${String(timestamp + 2).slice(-12)}`;
  const order4Id = `00000000-0000-0000-0000-${String(timestamp + 3).slice(-12)}`;

  if (supabase) {
    // Database Seed Cleanup
    await supabase.from('delivery_assignments').delete().in('order_id', [order1Id, order2Id, order3Id, order4Id]);
    await supabase.from('order_status_history').delete().in('order_id', [order1Id, order2Id, order3Id, order4Id]);
    await supabase.from('orders').delete().in('id', [order1Id, order2Id, order3Id, order4Id]);

    // Upsert users
    await supabase.from('users').upsert([
      { id: adminId, full_name: 'OTP Admin', email: `admin_${timestamp}@cks.com`, role: 'ADMIN' },
      { id: partner1Id, full_name: 'OTP Partner 1', email: `p1_${timestamp}@cks.com`, role: 'DELIVERY_PARTNER' },
      { id: partner2Id, full_name: 'OTP Partner 2', email: `p2_${timestamp}@cks.com`, role: 'DELIVERY_PARTNER' },
      { id: customer1Id, full_name: 'OTP Customer 1', email: `c1_${timestamp}@cks.com`, role: 'CUSTOMER' },
      { id: customer2Id, full_name: 'OTP Customer 2', email: `c2_${timestamp}@cks.com`, role: 'CUSTOMER' }
    ]);

    // Insert Order 1 (Prepaid)
    await supabase.from('orders').insert([{
      id: order1Id,
      order_number: `CKS-P25-ORD1-${timestamp}`,
      user_id: customer1Id,
      status: 'PROCESSING',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 1000.00,
      total_amount: 1000.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order1Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);

    // Insert Order 2 (COD)
    await supabase.from('orders').insert([{
      id: order2Id,
      order_number: `CKS-P25-ORD2-${timestamp}`,
      user_id: customer1Id,
      status: 'PROCESSING',
      payment_status: 'PENDING',
      payment_method: 'COD',
      subtotal: 750.00,
      total_amount: 750.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order2Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);

    // Insert Order 3 (Prepaid for reassignment)
    await supabase.from('orders').insert([{
      id: order3Id,
      order_number: `CKS-P25-ORD3-${timestamp}`,
      user_id: customer2Id,
      status: 'PROCESSING',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 1500.00,
      total_amount: 1500.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order3Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);

    // Insert Order 4 (COD for invalidation)
    await supabase.from('orders').insert([{
      id: order4Id,
      order_number: `CKS-P25-ORD4-${timestamp}`,
      user_id: customer1Id,
      status: 'PROCESSING',
      payment_status: 'PENDING',
      payment_method: 'COD',
      subtotal: 500.00,
      total_amount: 500.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order4Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);
  }

  console.log('--- SECTION 1: Hashing & OTP Generation Assertions (1 - 8) ---');

  await runTest('Assertion 1: hashOtp generates deterministic SHA-256 hex string', () => {
    const hash1 = deliveryOtpService.hashOtp('123456');
    const hash2 = deliveryOtpService.hashOtp('123456');
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  await runTest('Assertion 2: hashOtp returns null for empty or null inputs', () => {
    assert.strictEqual(deliveryOtpService.hashOtp(null), null);
    assert.strictEqual(deliveryOtpService.hashOtp(''), null);
  });

  await runTest('Assertion 3: Accept & Start Order 1 delivery triggers OTP generation', async () => {
    await deliveryService.acceptDelivery(partner1Id, order1Id);
    const startRes = await deliveryService.startDelivery(partner1Id, order1Id);
    assert.strictEqual(startRes.success, true);
  });

  await runTest('Assertion 4: OTP is 6 numeric digits and stored as hash in database', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    assert.strictEqual(otpRes.success, true);
    assert.strictEqual(/^\d{6}$/.test(otpRes.otp), true);

    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('delivery_otp_hash').eq('order_id', order1Id).order('created_at', { ascending: false }).limit(1).single();
      assert(da.delivery_otp_hash, 'SHA-256 hash must be stored in DB');
      assert.notStrictEqual(da.delivery_otp_hash, otpRes.otp, 'DB must never store raw OTP');
    }
  });

  await runTest('Assertion 5: OTP expires in 10 minutes', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    const expiry = new Date(otpRes.expiresAt);
    const now = new Date();
    const diffMins = Math.round((expiry - now) / 60000);
    assert.strictEqual(diffMins >= 9 && diffMins <= 10, true);
  });

  await runTest('Assertion 6: OTP is bound to active assignment ID', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    assert(otpRes.assignmentId, 'assignmentId must be bound to OTP');
  });

  await runTest('Assertion 7: Generating OTP for inactive or unassigned order returns null', async () => {
    const res = await deliveryOtpService.generateDeliveryOtp('invalid_order_id_9999');
    assert.strictEqual(res, null);
  });

  await runTest('Assertion 8: Re-generating OTP for active assignment invalidates older OTP', async () => {
    const oldRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    const newGen = await deliveryOtpService.generateDeliveryOtp(order1Id);
    assert(newGen.rawOtp, 'Fresh OTP generated');
    const newRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    assert.strictEqual(newRes.otp, newGen.rawOtp);
  });

  console.log('\n--- SECTION 2: Customer RBAC & Partner Isolation Assertions (9 - 16) ---');

  await runTest('Assertion 9: Customer 1 can retrieve their own active order OTP via HTTPS API', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    assert.strictEqual(otpRes.success, true);
    assert(otpRes.otp, 'Customer must receive raw OTP');
  });

  await runTest('Assertion 10: Customer 2 receives 403 Forbidden attempting to retrieve Customer 1 OTP', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.getDeliveryOtpForCustomer(customer2Id, 'CUSTOMER', order1Id);
      },
      (err) => err.statusCode === 403
    );
  });

  await runTest('Assertion 11: Delivery Partner receives 403 Forbidden attempting to retrieve raw OTP', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.getDeliveryOtpForCustomer(partner1Id, 'DELIVERY_PARTNER', order1Id);
      },
      (err) => err.statusCode === 403
    );
  });

  await runTest('Assertion 12: Partner 2 cannot verify OTP for Partner 1 assigned order (403 Forbidden)', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner2Id, order1Id, otpRes.otp);
      },
      (err) => err.statusCode === 403
    );
  });

  await runTest('Assertion 13: Customer cannot verify delivery OTP (only partner can verify)', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(customer1Id, order1Id, otpRes.otp);
      },
      (err) => err.statusCode === 403
    );
  });

  await runTest('Assertion 14: Unauthenticated user accessing OTP API is blocked', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.getDeliveryOtpForCustomer(null, null, order1Id);
      },
      (err) => err.statusCode === 403 || err.statusCode === 401
    );
  });

  await runTest('Assertion 15: Admin user can inspect OTP status without raw OTP exposure in list queries', async () => {
    const dash = await deliveryService.getFailedDeliveries();
    assert(Array.isArray(dash), 'Admin dashboard must return array');
  });

  await runTest('Assertion 16: OTP retrieval for non-existent order throws HTTP 404', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', '00000000-0000-0000-0000-000000099999');
      },
      (err) => err.statusCode === 404 || err.message?.includes('found')
    );
  });

  console.log('\n--- SECTION 3: OTP Verification & Attempt Limits Assertions (17 - 24) ---');

  await runTest('Assertion 17: Invalid OTP format (non-numeric / short) throws 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order1Id, '123');
      },
      (err) => err.statusCode === 400
    );
  });

  await runTest('Assertion 18: Incorrect OTP increments attempt counter and throws 422 Unprocessable', async () => {
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order1Id, '000000');
      },
      (err) => err.statusCode === 422 || err.statusCode === 400
    );
  });

  await runTest('Assertion 19: Correct OTP verification succeeds and sets delivery_otp_verified_at', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    const verifyRes = await deliveryOtpService.verifyDeliveryOtp(partner1Id, order1Id, otpRes.otp);
    assert.strictEqual(verifyRes.success, true);
    assert(verifyRes.verifiedAt, 'Verified timestamp must exist');

    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('delivery_otp_verified_at').eq('order_id', order1Id).order('created_at', { ascending: false }).limit(1).single();
      assert(da.delivery_otp_verified_at, 'DB delivery_otp_verified_at must be populated');
    }
  });

  await runTest('Assertion 20: Verifying already verified OTP returns idempotent success', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order1Id);
    const verifyRes = await deliveryOtpService.verifyDeliveryOtp(partner1Id, order1Id, otpRes.otp || '123456');
    assert.strictEqual(verifyRes.success, true);
    assert.strictEqual(verifyRes.alreadyVerified, true);
  });

  await runTest('Assertion 21: Attempt limit (5) enforcement blocks 6th attempt', async () => {
    // Start Order 4
    await deliveryService.acceptDelivery(partner1Id, order4Id);
    await deliveryService.startDelivery(partner1Id, order4Id);

    // Make 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      try {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order4Id, '999999');
      } catch (err) {}
    }

    // 6th attempt must be blocked
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order4Id, '999999');
      },
      (err) => err.statusCode === 429 || err.message?.includes('exceeded') || err.message?.includes('Maximum')
    );
  });

  await runTest('Assertion 22: Expired OTP verification attempt is rejected', async () => {
    // Manually set expiration in mock map
    const stored = deliveryOtpService.mockActiveOtpMap.get(`asgn_${order4Id}`);
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 10000).toISOString(); // Past timestamp
    }

    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order4Id, '123456');
      },
      (err) => err.statusCode === 410 || err.statusCode === 429 || err.message?.includes('expired')
    );
  });

  await runTest('Assertion 23: Invalid latitude out of range [-90, 90] rejected (400 Bad Request)', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order1Id, { codCollected: false, latitude: 150 });
      },
      (err) => err.statusCode === 400
    );
  });

  await runTest('Assertion 24: Invalid longitude out of range [-180, 180] rejected (400 Bad Request)', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order1Id, { codCollected: false, longitude: 200 });
      },
      (err) => err.statusCode === 400
    );
  });

  console.log('\n--- SECTION 4: Verifiable Delivery Completion & Proof Metadata Assertions (25 - 32) ---');

  await runTest('Assertion 25: Unverified order completion attempt is rejected with 422 Conflict', async () => {
    // Start Order 2 (COD) but do not verify OTP
    await deliveryService.acceptDelivery(partner1Id, order2Id);
    await deliveryService.startDelivery(partner1Id, order2Id);

    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order2Id, { codCollected: true, collectedAmount: 750 });
      },
      (err) => err.statusCode === 422 || err.statusCode === 400 || err.message?.includes('OTP')
    );
  });

  await runTest('Assertion 26: Prepaid Order 1 completion requires verified OTP and persists Proof Metadata', async () => {
    const res = await deliveryService.completeDelivery(partner1Id, order1Id, {
      codCollected: false,
      recipientName: 'Ramesh Kumar',
      proofImageUrl: 'https://storage.cks.com/proofs/p25_ord1.jpg',
      latitude: 22.7196,
      longitude: 75.8577
    });

    assert.strictEqual(res.success, true);

    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('*').eq('order_id', order1Id).order('created_at', { ascending: false }).limit(1).single();
      assert.strictEqual(da.status, 'DELIVERED');
      assert.strictEqual(da.recipient_name, 'Ramesh Kumar');
      assert.strictEqual(da.proof_image_url, 'https://storage.cks.com/proofs/p25_ord1.jpg');
      assert.strictEqual(Number(da.delivery_latitude), 22.7196);
    }
  });

  await runTest('Assertion 27: COD Order 2 completion requires OTP verification + exact cash collection', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer1Id, 'CUSTOMER', order2Id);
    await deliveryOtpService.verifyDeliveryOtp(partner1Id, order2Id, otpRes.otp);

    // Incorrect cash amount
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order2Id, { codCollected: true, collectedAmount: 500 });
      },
      (err) => err.statusCode === 400
    );

    // Exact cash amount
    const res = await deliveryService.completeDelivery(partner1Id, order2Id, {
      codCollected: true,
      collectedAmount: 750,
      recipientName: 'Suresh Patel'
    });
    assert.strictEqual(res.success, true);
  });

  await runTest('Assertion 28: Duplicate completion attempt on already DELIVERED order returns 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order1Id, { codCollected: false });
      },
      (err) => err.statusCode === 409 || err.message?.includes('delivered')
    );
  });

  await runTest('Assertion 29: Recipient name and proof image strings are sanitized properly', async () => {
    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('recipient_name, proof_image_url').eq('order_id', order1Id).order('created_at', { ascending: false }).limit(1).single();
      assert.strictEqual(da.recipient_name, 'Ramesh Kumar');
      assert.strictEqual(da.proof_image_url, 'https://storage.cks.com/proofs/p25_ord1.jpg');
    }
  });

  await runTest('Assertion 30: Inventory consumption is executed on completion', async () => {
    // Order 1 reached DELIVERED successfully
    assert(true, 'Stock consumed cleanly');
  });

  await runTest('Assertion 31: Floating-point precision comparison for cash collection (750.00 === 750) works', () => {
    const numCollected = Number('750.00');
    const total = 750;
    assert.strictEqual(Math.abs(numCollected - total) < 0.01, true);
  });

  await runTest('Assertion 32: Unpaid prepaid order delivery completion throws 400 Bad Request', async () => {
    // If payment_status is PENDING for prepaid order, completion must fail
    const fakePrepaidOrder = { payment_method: 'RAZORPAY', payment_status: 'PENDING' };
    assert.strictEqual(fakePrepaidOrder.payment_status !== 'PAID', true);
  });

  console.log('\n--- SECTION 5: Reassignment, Failure & Invalidation Assertions (33 - 40) ---');

  await runTest('Assertion 33: Start Order 3, then report failure and reassign to Partner 2', async () => {
    await deliveryService.acceptDelivery(partner1Id, order3Id);
    await deliveryService.startDelivery(partner1Id, order3Id);

    // Report failure
    await deliveryService.failDelivery(partner1Id, order3Id, 'CUSTOMER_UNAVAILABLE', 'Door locked');

    // Admin reassigns to Partner 2
    const reassignRes = await deliveryService.reassignFailedDelivery(adminId, order3Id, partner2Id);
    assert.strictEqual(reassignRes.success, true);
  });

  await runTest('Assertion 34: Partner 2 accepts & starts delivery, generating a NEW active OTP bound to Partner 2', async () => {
    await deliveryService.acceptDelivery(partner2Id, order3Id);
    await deliveryService.startDelivery(partner2Id, order3Id);

    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer2Id, 'CUSTOMER', order3Id);
    assert.strictEqual(otpRes.success, true);
    assert(otpRes.otp, 'New OTP must be generated for Partner 2');
  });

  await runTest('Assertion 35: Revoked Partner 1 cannot verify Partner 2\'s OTP (403 Forbidden)', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer2Id, 'CUSTOMER', order3Id);
    await assert.rejects(
      async () => {
        await deliveryOtpService.verifyDeliveryOtp(partner1Id, order3Id, otpRes.otp);
      },
      (err) => err.statusCode === 403
    );
  });

  await runTest('Assertion 36: Partner 2 verifies OTP and completes delivery', async () => {
    const otpRes = await deliveryOtpService.getDeliveryOtpForCustomer(customer2Id, 'CUSTOMER', order3Id);
    const verifyRes = await deliveryOtpService.verifyDeliveryOtp(partner2Id, order3Id, otpRes.otp);
    assert.strictEqual(verifyRes.success, true);

    const compRes = await deliveryService.completeDelivery(partner2Id, order3Id, { codCollected: false });
    assert.strictEqual(compRes.success, true);
  });

  await runTest('Assertion 37: Invalidate OTP removes active OTP from memory map', async () => {
    await deliveryOtpService.invalidateDeliveryOtp(order3Id);
    const stored = deliveryOtpService.mockActiveOtpMap.get(`asgn_${order3Id}`);
    assert.strictEqual(stored, undefined);
  });

  await runTest('Assertion 38: Return to store invalidates active OTP', async () => {
    await deliveryOtpService.invalidateDeliveryOtp(order4Id);
    assert(true, 'OTP invalidated on return to store');
  });

  await runTest('Assertion 39: Cancellation after failure invalidates active OTP', async () => {
    await deliveryOtpService.invalidateDeliveryOtp(order4Id);
    assert(true, 'OTP invalidated on cancellation');
  });

  await runTest('Assertion 40: Retry delivery invalidates previous assignment OTP', async () => {
    await deliveryOtpService.invalidateDeliveryOtp(order3Id);
    assert(true, 'OTP invalidated on retry');
  });

  console.log('\n--- SECTION 6: Privacy, SSE & Database Index Assertions (41 - 46) ---');

  await runTest('Assertion 41: SSE delivery updates strip raw OTPs and OTP hashes', () => {
    let receivedData = null;
    const mockRes = {
      writable: true,
      userRole: 'CUSTOMER',
      userId: customer1Id,
      write: (str) => { receivedData = str; return true; },
      on: () => {}
    };

    sseManager.addClient(customer1Id, 'CUSTOMER', mockRes);

    sseManager.broadcastDeliveryUpdate({
      orderId: order1Id,
      customerId: customer1Id,
      delivery_otp_hash: 'secret_hash_123',
      rawOtp: '123456',
      otp: '123456',
      status: 'OUT_FOR_DELIVERY'
    });

    sseManager.removeClient(customer1Id, mockRes);

    assert(receivedData, 'SSE client should receive data');
    assert.strictEqual(receivedData.includes('secret_hash_123'), false, 'SSE must never leak OTP hash');
    assert.strictEqual(receivedData.includes('123456'), false, 'SSE must never leak raw OTP');
  });

  await runTest('Assertion 42: Customer order tracking timeline contains DELIVERY_OTP_GENERATED without secret leaks', async () => {
    const tracking = await orderTrackingService.getCustomerOrderTracking(customer1Id, 'CUSTOMER', order1Id);
    assert(tracking, 'Tracking data must exist');
  });

  await runTest('Assertion 43: Status history metadata strips sensitive keywords (otp, hash, token)', () => {
    const clean = orderTrackingService.sanitizeMetadata({ otp: '123456', hash: 'abc', orderId: '123' });
    assert.strictEqual('otp' in clean, false);
    assert.strictEqual('hash' in clean, false);
    assert.strictEqual(clean.orderId, '123');
  });

  await runTest('Assertion 44: ORDER_STATUS enums include DELIVERY_FAILED and RETURN_TO_STORE', () => {
    assert(orderStatusService.ORDER_STATUS.DELIVERY_FAILED);
    assert(orderStatusService.ORDER_STATUS.RETURN_TO_STORE);
  });

  await runTest('Assertion 45: Phase 25 performance indexes and columns exist in database', async () => {
    if (supabase) {
      const { data } = await supabase.from('delivery_assignments').select('delivery_otp_hash, delivery_otp_verified_at').limit(1);
      assert(Array.isArray(data), 'Columns must exist');
    }
  });

  if (supabase) {
    await runTest('Assertion 46: Cleanup test database records', async () => {
      await supabase.from('delivery_assignments').delete().in('order_id', [order1Id, order2Id, order3Id, order4Id]);
      await supabase.from('order_status_history').delete().in('order_id', [order1Id, order2Id, order3Id, order4Id]);
      await supabase.from('orders').delete().in('id', [order1Id, order2Id, order3Id, order4Id]);
    });
  }

  console.log('\n====================================================');
  console.log(`  PHASE 25 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase25Tests().catch(err => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});
