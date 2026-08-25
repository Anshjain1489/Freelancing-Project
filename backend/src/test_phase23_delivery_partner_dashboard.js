const assert = require('assert');
const supabase = require('./config/supabase');
const deliveryService = require('./services/delivery.management.service');
const AppError = require('./utils/AppError');
const { HTTP_STATUS } = require('./constants/statusCodes');
const { authorizeDeliveryPartner } = require('./middleware/auth.middleware');

async function runPhase23Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 23: DELIVERY PARTNER DASHBOARD & WORKFLOW (36 TESTS)');
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

  const partner1Id = '00000000-0000-0000-0000-000000009001';
  const partner2Id = '00000000-0000-0000-0000-000000009002';
  const customerId = '00000000-0000-0000-0000-000000008001';
  const timestamp = Date.now();

  const order1Id = `00000000-0000-0000-0000-${String(timestamp).slice(-12)}`;
  const order2Id = `00000000-0000-0000-0000-${String(timestamp + 1).slice(-12)}`;
  const order3Id = `00000000-0000-0000-0000-${String(timestamp + 2).slice(-12)}`;

  if (supabase) {
    // Clean up existing test records and any leftover assignments for test partners
    await supabase.from('delivery_assignments').delete().in('delivery_partner_id', [partner1Id, partner2Id]);
    await supabase.from('delivery_assignments').delete().in('order_id', [order1Id, order2Id, order3Id]);
    await supabase.from('order_status_history').delete().in('order_id', [order1Id, order2Id, order3Id]);
    await supabase.from('orders').delete().in('id', [order1Id, order2Id, order3Id]);

    // Ensure partner users exist
    await supabase.from('users').upsert([
      { id: partner1Id, full_name: 'Partner One', email: `partner1_${timestamp}@cks.com`, role: 'DELIVERY_PARTNER' },
      { id: partner2Id, full_name: 'Partner Two', email: `partner2_${timestamp}@cks.com`, role: 'DELIVERY_PARTNER' },
      { id: customerId, full_name: 'Test Customer', email: `cust_${timestamp}@cks.com`, role: 'CUSTOMER' }
    ]);

    // Insert Order 1 (Prepaid, Assigned to Partner 1)
    await supabase.from('orders').insert([{
      id: order1Id,
      order_number: `CKS-P23-ORD1-${timestamp}`,
      user_id: customerId,
      status: 'PROCESSING',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 1200.00,
      total_amount: 1200.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order1Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);

    // Insert Order 2 (COD, Assigned to Partner 1)
    await supabase.from('orders').insert([{
      id: order2Id,
      order_number: `CKS-P23-ORD2-${timestamp}`,
      user_id: customerId,
      status: 'PROCESSING',
      payment_status: 'PENDING',
      payment_method: 'COD',
      subtotal: 850.00,
      total_amount: 850.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order2Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);

    // Insert Order 3 (Prepaid, Assigned to Partner 1 for failure testing)
    await supabase.from('orders').insert([{
      id: order3Id,
      order_number: `CKS-P23-ORD3-${timestamp}`,
      user_id: customerId,
      status: 'PROCESSING',
      payment_status: 'PAID',
      payment_method: 'RAZORPAY',
      subtotal: 450.00,
      total_amount: 450.00
    }]);

    await supabase.from('delivery_assignments').insert([{
      order_id: order3Id,
      delivery_partner_id: partner1Id,
      status: 'ASSIGNED',
      assigned_at: new Date().toISOString()
    }]);
  }

  // ----------------------------------------------------
  // GROUP 1: DASHBOARD OVERVIEW METRICS (TESTS 1 - 6)
  // ----------------------------------------------------
  console.log('📌 GROUP 1: DASHBOARD OVERVIEW METRICS (TESTS 1 - 6)\n');

  await test('1. Partner dashboard overview returns success: true', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert.strictEqual(dash.success, true);
  });

  await test('2. Partner dashboard summary contains assigned, accepted, outForDelivery, codPending, failed, deliveredToday', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert(dash.summary, 'Summary object must exist');
    assert('assigned' in dash.summary, 'assigned count present');
    assert('accepted' in dash.summary, 'accepted count present');
    assert('outForDelivery' in dash.summary, 'outForDelivery count present');
    assert('codPending' in dash.summary, 'codPending count present');
    assert('failed' in dash.summary, 'failed count present');
    assert('deliveredToday' in dash.summary, 'deliveredToday count present');
  });

  await test('3. Initial assigned count matches seeded assignments', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert.strictEqual(dash.summary.assigned, 3, 'Should have 3 assigned deliveries');
  });

  await test('4. Initial COD pending count includes active COD order', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert.strictEqual(dash.summary.codPending, 1, 'Should have 1 COD pending order');
  });

  await test('5. Active deliveries list returns item details', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert(Array.isArray(dash.activeDeliveries), 'activeDeliveries must be array');
    assert(dash.activeDeliveries.length >= 3, 'Active deliveries should contain seeded orders');
  });

  await test('6. Active delivery item contains customerName, deliveryAddress, callUrl, and googleMapsUrl', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    const item = dash.activeDeliveries[0];
    assert(item.customerName, 'customerName must be present');
    assert(item.deliveryAddress, 'deliveryAddress must be present');
    assert(item.callUrl, 'callUrl must be present');
    assert(item.googleMapsUrl, 'googleMapsUrl must be present');
  });

  // ----------------------------------------------------
  // GROUP 2: ROLE AUTHORIZATION & ISOLATION (TESTS 7 - 12)
  // ----------------------------------------------------
  console.log('\n📌 GROUP 2: ROLE AUTHORIZATION & ISOLATION (TESTS 7 - 12)\n');

  await test('7. CUSTOMER role is blocked from delivery partner middleware with 403', async () => {
    let errRes = null;
    authorizeDeliveryPartner({ user: { id: customerId, role: 'CUSTOMER' } }, {}, (err) => { errRes = err; });
    assert(errRes && errRes.statusCode === 403, 'Must return 403 Forbidden for CUSTOMER role');
  });

  await test('8. ADMIN role is blocked from delivery partner routes with 403', async () => {
    let errRes = null;
    authorizeDeliveryPartner({ user: { id: 'admin_1', role: 'ADMIN' } }, {}, (err) => { errRes = err; });
    assert(errRes && errRes.statusCode === 403, 'Must return 403 Forbidden for ADMIN role on partner route');
  });

  await test('9. DELIVERY_PARTNER role is authorized by middleware', async () => {
    let errRes = null;
    authorizeDeliveryPartner({ user: { id: partner1Id, role: 'DELIVERY_PARTNER' } }, {}, (err) => { errRes = err; });
    assert(!errRes, 'Must allow DELIVERY_PARTNER role');
  });

  await test('10. Delivery partner can view their own assigned order details', async () => {
    const detail = await deliveryService.getPartnerOrderById(partner1Id, order1Id);
    assert.strictEqual(detail.orderId, order1Id, 'Assigned partner must be able to view order');
  });

  await test('11. Partner 2 viewing Partner 1 assigned order returns 403 Forbidden', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.getPartnerOrderById(partner2Id, order1Id);
      },
      (err) => err.statusCode === 403 || err.message?.includes('authorized') || err.message?.includes('Forbidden')
    );
  });

  await test('12. Partner 2 attempting action on Partner 1 assigned order returns 403 Forbidden', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.acceptDelivery(partner2Id, order1Id);
      },
      (err) => err.statusCode === 403 || err.message?.includes('authorized') || err.message?.includes('Forbidden')
    );
  });

  // ----------------------------------------------------
  // GROUP 3: ACCEPT & START DELIVERY WORKFLOW (TESTS 13 - 20)
  // ----------------------------------------------------
  console.log('\n📌 GROUP 3: ACCEPT & START DELIVERY WORKFLOW (TESTS 13 - 20)\n');

  await test('13. Partner 1 accepts assigned Order 1', async () => {
    const res = await deliveryService.acceptDelivery(partner1Id, order1Id);
    assert.strictEqual(res.success, true, 'Accepting delivery must succeed');
  });

  await test('14. Order 1 delivery assignment status is now ACCEPTED', async () => {
    const detail = await deliveryService.getPartnerOrderById(partner1Id, order1Id);
    assert.strictEqual(detail.deliveryStatus, 'ACCEPTED');
  });

  await test('15. Attempting to accept Order 1 again returns HTTP 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.acceptDelivery(partner1Id, order1Id);
      },
      (err) => err.statusCode === 409 || err.message?.includes('accepted')
    );
  });

  await test('16. Partner 1 starts delivery for Order 1 (ACCEPTED -> OUT_FOR_DELIVERY)', async () => {
    const res = await deliveryService.startDelivery(partner1Id, order1Id);
    assert.strictEqual(res.success, true, 'Starting delivery must succeed');
  });

  await test('17. Order 1 delivery assignment status is now OUT_FOR_DELIVERY', async () => {
    const detail = await deliveryService.getPartnerOrderById(partner1Id, order1Id);
    assert.strictEqual(detail.deliveryStatus, 'OUT_FOR_DELIVERY');
  });

  await test('18. Order 1 main orders table status updated to OUT_FOR_DELIVERY', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', order1Id).single();
      assert.strictEqual(o.status, 'OUT_FOR_DELIVERY');
    }
  });

  await test('19. Attempting to start Order 1 again returns HTTP 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.startDelivery(partner1Id, order1Id);
      },
      (err) => err.statusCode === 409 || err.message?.includes('status')
    );
  });

  await test('20. Dashboard active count reflects accepted & outForDelivery orders', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert.strictEqual(dash.summary.accepted, 0);
    assert.strictEqual(dash.summary.outForDelivery, 1);
  });

  // ----------------------------------------------------
  // GROUP 4: PREPAID & COD COMPLETION SAFEGUARDS (TESTS 21 - 28)
  // ----------------------------------------------------
  console.log('\n📌 GROUP 4: PREPAID & COD COMPLETION SAFEGUARDS (TESTS 21 - 28)\n');

  await test('21. Prepaid Order 1 marked DELIVERED successfully', async () => {
    const res = await deliveryService.completeDelivery(partner1Id, order1Id, { codCollected: false });
    assert.strictEqual(res.success, true);
  });

  await test('22. Order 1 status in DB is DELIVERED', async () => {
    if (supabase) {
      const { data: o } = await supabase.from('orders').select('status').eq('id', order1Id).single();
      assert.strictEqual(o.status, 'DELIVERED');
    }
  });

  await test('23. Attempting to mark DELIVERED again returns 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order1Id, { codCollected: false });
      },
      (err) => err.statusCode === 409 || err.message?.includes('delivered')
    );
  });

  await test('24. Accept & Start Order 2 (COD Order)', async () => {
    await deliveryService.acceptDelivery(partner1Id, order2Id);
    await deliveryService.startDelivery(partner1Id, order2Id);
    const detail = await deliveryService.getPartnerOrderById(partner1Id, order2Id);
    assert.strictEqual(detail.deliveryStatus, 'OUT_FOR_DELIVERY');
  });

  await test('25. COD Order 2 completion without codCollected returns 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order2Id, { codCollected: false });
      },
      (err) => err.statusCode === 400 || err.message?.includes('COD') || err.message?.includes('cash')
    );
  });

  await test('26. COD Order 2 completion with incorrect cash amount returns 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.completeDelivery(partner1Id, order2Id, { codCollected: true, collectedAmount: 500 }); // Order total is 850
      },
      (err) => err.statusCode === 400 || err.message?.includes('equal') || err.message?.includes('amount')
    );
  });

  await test('27. COD Order 2 completion with exact cash amount (850.00) succeeds', async () => {
    const res = await deliveryService.completeDelivery(partner1Id, order2Id, { codCollected: true, collectedAmount: 850 });
    assert.strictEqual(res.success, true);
  });

  await test('28. COD collected fields recorded in delivery_assignments table', async () => {
    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('cod_collected, cod_collected_amount').eq('order_id', order2Id).single();
      assert.strictEqual(da.cod_collected, true);
      assert.strictEqual(parseFloat(da.cod_collected_amount), 850.00);
    }
  });

  // ----------------------------------------------------
  // GROUP 5: FAILURE REASONS & NOTES VALIDATION (TESTS 29 - 34)
  // ----------------------------------------------------
  console.log('\n📌 GROUP 5: FAILURE REASONS & NOTES VALIDATION (TESTS 29 - 34)\n');

  await test('29. Empty failure reason returns 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.failDelivery(partner1Id, order3Id, '');
      },
      (err) => err.statusCode === 400 || err.message?.includes('required')
    );
  });

  await test('30. Invalid failure reason enum returns 400 Bad Request', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.failDelivery(partner1Id, order3Id, 'RANDOM_INVALID_REASON');
      },
      (err) => err.statusCode === 400 || err.message?.includes('reason') || err.message?.includes('Must be one of')
    );
  });

  await test('31. Valid failure reason (CUSTOMER_UNAVAILABLE) succeeds with internal notes', async () => {
    await deliveryService.acceptDelivery(partner1Id, order3Id);
    await deliveryService.startDelivery(partner1Id, order3Id);
    const res = await deliveryService.failDelivery(partner1Id, order3Id, 'CUSTOMER_UNAVAILABLE', 'Door locked, tried calling 3 times');
    assert.strictEqual(res.success, true);
  });

  await test('32. Delivery status in DB updated to FAILED', async () => {
    if (supabase) {
      const { data: da } = await supabase.from('delivery_assignments').select('status, failure_reason, failure_notes').eq('order_id', order3Id).single();
      assert.strictEqual(da.status, 'FAILED');
      assert.strictEqual(da.failure_reason, 'CUSTOMER_UNAVAILABLE');
      assert.strictEqual(da.failure_notes, 'Door locked, tried calling 3 times');
    }
  });

  await test('33. Attempting to fail an already DELIVERED order returns 409 Conflict', async () => {
    await assert.rejects(
      async () => {
        await deliveryService.failDelivery(partner1Id, order1Id, 'CUSTOMER_REFUSED');
      },
      (err) => err.statusCode === 409 || err.message?.includes('finished') || err.message?.includes('delivered')
    );
  });

  await test('34. Dashboard summary reflects delivered and failed totals accurately', async () => {
    const dash = await deliveryService.getPartnerDashboard(partner1Id);
    assert.strictEqual(dash.summary.deliveredToday, 2);
    assert.strictEqual(dash.summary.failed, 1);
  });

  // ----------------------------------------------------
  // GROUP 6: AUDIT TIMELINE & CLEANUP (TESTS 35 - 36)
  // ----------------------------------------------------
  console.log('\n📌 GROUP 6: AUDIT TIMELINE & REGRESSION (TESTS 35 - 36)\n');

  await test('35. Status history records created for workflow events', async () => {
    if (supabase) {
      const { data: history } = await supabase.from('order_status_history').select('*').eq('order_id', order1Id);
      assert(history && history.length >= 2, 'Status history records must exist for Order 1 transitions');
    }
  });

  await test('36. Cleanup test records from database', async () => {
    if (supabase) {
      await supabase.from('delivery_assignments').delete().in('order_id', [order1Id, order2Id, order3Id]);
      await supabase.from('order_status_history').delete().in('order_id', [order1Id, order2Id, order3Id]);
      await supabase.from('orders').delete().in('id', [order1Id, order2Id, order3Id]);
    }
    assert(true, 'Test records cleaned up cleanly');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 23 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase23Tests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
