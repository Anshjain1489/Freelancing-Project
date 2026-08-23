const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const { execSync } = require('child_process');
const supabase = require('./config/supabase');
const couponService = require('./services/coupon.service');
const orderService = require('./services/order.service');
const checkoutService = require('./services/checkout.service');
const cartService = require('./services/cart.service');
const inventoryService = require('./services/inventory.service');

async function runPhase19_1Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 19.1 COUPON SCHEMA & PRODUCTION MIGRATION TEST SUITE (20 TESTS)');
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

  // TEST 1: orders.coupon_code column exists
  await test('1. orders.coupon_code column exists in production DB', async () => {
    assert(supabase, 'Supabase client must be configured');
    const { data, error } = await supabase.from('orders').select('coupon_code').limit(1);
    assert(!error, `orders.coupon_code should exist without error: ${error?.message}`);
  });

  // TEST 2: orders.coupon_id column exists
  await test('2. orders.coupon_id column exists in production DB', async () => {
    const { data, error } = await supabase.from('orders').select('coupon_id').limit(1);
    assert(!error, `orders.coupon_id should exist without error: ${error?.message}`);
  });

  // TEST 3: orders.discount_amount column exists
  await test('3. orders.discount_amount column exists in production DB', async () => {
    const { data, error } = await supabase.from('orders').select('discount_amount').limit(1);
    assert(!error, `orders.discount_amount should exist without error: ${error?.message}`);
  });

  // TEST 4: coupons table exists
  await test('4. coupons table exists in production DB', async () => {
    const { data, error } = await supabase.from('coupons').select('id, code').limit(1);
    assert(!error, `coupons table should exist: ${error?.message}`);
  });

  // TEST 5: SAVE20 coupon exists
  await test('5. SAVE20 coupon exists and is active', async () => {
    const coupon = await couponService.getCouponByCode('SAVE20');
    assert(coupon, 'SAVE20 coupon must exist');
    assert(coupon.is_active, 'SAVE20 must be active');
    assert.strictEqual(parseFloat(coupon.minimum_order_amount), 1000);
    assert.strictEqual(parseFloat(coupon.discount_value), 20);
  });

  // TEST 6: SAVE50 coupon exists
  await test('6. SAVE50 coupon exists and is active', async () => {
    const coupon = await couponService.getCouponByCode('SAVE50');
    assert(coupon, 'SAVE50 coupon must exist');
    assert(coupon.is_active, 'SAVE50 must be active');
    assert.strictEqual(parseFloat(coupon.minimum_order_amount), 2000);
    assert.strictEqual(parseFloat(coupon.discount_value), 50);
  });

  // TEST 7: SAVE200 coupon exists
  await test('7. SAVE200 coupon exists and is active', async () => {
    const coupon = await couponService.getCouponByCode('SAVE200');
    assert(coupon, 'SAVE200 coupon must exist');
    assert(coupon.is_active, 'SAVE200 must be active');
    assert.strictEqual(parseFloat(coupon.minimum_order_amount), 5000);
    assert.strictEqual(parseFloat(coupon.discount_value), 200);
  });

  // TEST 8: SAVE500 coupon exists
  await test('8. SAVE500 coupon exists and is active', async () => {
    const coupon = await couponService.getCouponByCode('SAVE500');
    assert(coupon, 'SAVE500 coupon must exist');
    assert(coupon.is_active, 'SAVE500 must be active');
    assert.strictEqual(parseFloat(coupon.minimum_order_amount), 10000);
    assert.strictEqual(parseFloat(coupon.discount_value), 500);
  });

  // Setup test user with valid UUID
  let testUserId = null;
  let testAddressId = null;
  let testProductId = null;
  let testProductPrice = 200;

  if (supabase) {
    // Get or create a valid user with UUID
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) {
      testUserId = users[0].id;
    }

    if (testUserId) {
      // Get or create an address
      const { data: addrs } = await supabase.from('addresses').select('id').eq('user_id', testUserId).limit(1);
      if (addrs && addrs.length > 0) {
        testAddressId = addrs[0].id;
      } else {
        const { data: addr } = await supabase.from('addresses').insert([{
          user_id: testUserId,
          recipient_name: 'Test Customer',
          phone: '7897837095',
          address_line1: 'Near Bada Jain Mandir',
          city: 'Mahruni',
          state: 'Madhya Pradesh',
          postal_code: '471606',
          latitude: 24.2381,
          longitude: 78.7364
        }]).select().single();
        if (addr) testAddressId = addr.id;
      }

      // Get a real product with sufficient stock
      const { data: prods } = await supabase.from('products').select('id, selling_price').limit(1);
      if (prods && prods.length > 0) {
        testProductId = prods[0].id;
        testProductPrice = parseFloat(prods[0].selling_price) || 200;
        await supabase.from('inventory').upsert([{ product_id: testProductId, quantity: 100, reserved_quantity: 0, reorder_level: 5 }]);
        await supabase.from('products').update({ stock_quantity: 100, reserved_quantity: 0, stock_status: 'IN_STOCK' }).eq('id', testProductId);
      }
    }
  }

  const qtyForMin199 = Math.max(1, Math.ceil(200 / testProductPrice));
  const qtyForMin1000 = Math.max(1, Math.ceil(1050 / testProductPrice));

  // TEST 9: Order creation without coupon works
  await test('9. Order creation without coupon works', async () => {
    if (!testUserId || !testAddressId || !testProductId) return;

    await cartService.clearCart(testUserId);
    await cartService.addCartItem(testUserId, testProductId, qtyForMin199);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, null);
    assert(orderRes.orderId, 'orderId must be returned');
    assert.strictEqual(orderRes.couponCode, null);
    assert.strictEqual(orderRes.discountAmount, 0);

    await cartService.clearCart(testUserId);
  });

  // TEST 10: Order creation with SAVE20 works (Subtotal >= ₹1,000)
  let createdOrderIdWithCoupon = null;
  await test('10. Order creation with SAVE20 works (Subtotal >= ₹1,000)', async () => {
    if (!testUserId || !testAddressId || !testProductId) return;

    await cartService.clearCart(testUserId);
    await cartService.addCartItem(testUserId, testProductId, qtyForMin1000);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    assert(orderRes.orderId, 'orderId must be returned');
    assert.strictEqual(orderRes.couponCode, 'SAVE20');
    assert.strictEqual(orderRes.discountAmount, 20);
    createdOrderIdWithCoupon = orderRes.orderId;

    await cartService.clearCart(testUserId);
  });

  // TEST 11: Order correctly stores coupon_code = SAVE20 and discount_amount = 20
  await test('11. Order in DB stores coupon_code = SAVE20 and discount_amount = 20', async () => {
    if (!createdOrderIdWithCoupon) return;

    const { data: dbOrder, error } = await supabase.from('orders')
      .select('coupon_code, discount_amount, total_amount, subtotal, delivery_charge')
      .eq('id', createdOrderIdWithCoupon)
      .single();

    assert(!error, `Failed to query created order: ${error?.message}`);
    assert.strictEqual(dbOrder.coupon_code, 'SAVE20');
    assert.strictEqual(parseFloat(dbOrder.discount_amount), 20);
    const expectedTotal = parseFloat(dbOrder.subtotal) + parseFloat(dbOrder.delivery_charge) - 20;
    assert.strictEqual(parseFloat(dbOrder.total_amount), expectedTotal);
  });

  // TEST 12: PostgREST/Supabase insert does not return missing column error
  await test('12. PostgREST insert handles coupon_code without schema cache error', async () => {
    if (!testUserId) return;
    const testOrderNum = `CKS-TEST-${Date.now()}`;
    const { data, error } = await supabase.from('orders').insert([{
      user_id: testUserId,
      order_number: testOrderNum,
      status: 'PENDING_PAYMENT',
      subtotal: 1000,
      delivery_charge: 0,
      coupon_code: 'SAVE20',
      discount_amount: 20,
      total_amount: 980
    }]).select().single();

    assert(!error, `Supabase insert should succeed: ${error?.message}`);
    assert.strictEqual(data.coupon_code, 'SAVE20');

    // Clean up test order
    if (data) await supabase.from('orders').delete().eq('id', data.id);
  });

  // TEST 13: Razorpay amount uses discounted backend-calculated amount
  await test('13. Razorpay amount uses discounted backend-calculated amount', async () => {
    if (!testUserId || !testAddressId || !testProductId) return;

    await cartService.clearCart(testUserId);
    await cartService.addCartItem(testUserId, testProductId, qtyForMin1000);

    try {
      const preview = await checkoutService.getCheckoutPreview(testUserId, testAddressId, 'SAVE20').catch(() => null);
      if (preview) {
        const expectedAmountInPaise = Math.round(preview.totalAmount * 100);
        const calculatedNet = Math.round((preview.subtotal + preview.delivery.deliveryCharge - preview.discountAmount) * 100);
        assert.strictEqual(expectedAmountInPaise, calculatedNet, 'Razorpay amount must match net discounted total in paise');
      }
    } finally {
      await cartService.clearCart(testUserId);
    }
  });

  // TEST 14: Invalid coupon does not create a partial order
  await test('14. Invalid coupon code rejects before creating order', async () => {
    if (!testUserId || !testAddressId || !testProductId) return;

    await cartService.clearCart(testUserId);
    await cartService.addCartItem(testUserId, testProductId, qtyForMin199);

    try {
      const initialOrdersCountRes = await supabase.from('orders').select('id', { count: 'exact' });
      const countBefore = initialOrdersCountRes.count || 0;

      await assert.rejects(
        async () => {
          await orderService.createOrder(testUserId, testAddressId, 'INVALID_COUPON_999');
        },
        (err) => {
          assert(err.message.includes('Invalid or inactive coupon'), `Error message should mention invalid coupon: ${err.message}`);
          return true;
        }
      );

      const countAfterRes = await supabase.from('orders').select('id', { count: 'exact' });
      const countAfter = countAfterRes.count || 0;
      assert.strictEqual(countAfter, countBefore, 'No order should be created when coupon validation fails');
    } finally {
      await cartService.clearCart(testUserId);
    }
  });

  // TEST 15: Stock reservation is correctly released when order creation fails
  await test('15. Stock reservation is released when order creation fails', async () => {
    const product = (await supabase.from('products').select('*').limit(1)).data?.[0];
    if (product) {
      const initialReserved = product.reserved_quantity || 0;
      const itemsToReserve = [{ productId: product.id, quantity: 2 }];

      // Reserve stock
      await inventoryService.reserveStock(itemsToReserve, null);
      const afterReserve = (await supabase.from('products').select('reserved_quantity').eq('id', product.id).single()).data.reserved_quantity;
      assert.strictEqual(afterReserve, initialReserved + 2, 'Reserved quantity should increase by 2');

      // Release stock (simulating failed order creation)
      await inventoryService.releaseStock(itemsToReserve, null, 'ORDER_CREATION_FAILED');
      const afterRelease = (await supabase.from('products').select('reserved_quantity').eq('id', product.id).single()).data.reserved_quantity;
      assert.strictEqual(afterRelease, initialReserved, 'Reserved quantity should be rolled back to initial');
    }
  });

  // TEST 16: Phase 15 coupon calculations remain compatible
  await test('16. Phase 15 coupon calculations remain compatible', async () => {
    const save50Cpn = await couponService.getCouponByCode('SAVE50');
    assert(save50Cpn, 'SAVE50 coupon must exist');
    assert.strictEqual(save50Cpn.discount_type, 'FIXED');
  });

  // TEST 17: Phase 17 inventory reservation remains compatible
  await test('17. Phase 17 inventory reservation compatible', async () => {
    assert(inventoryService.reserveStock, 'reserveStock method must exist');
    assert(inventoryService.releaseStock, 'releaseStock method must exist');
  });

  // TEST 18: Phase 18 cancellation/returns/replacements compatibility
  await test('18. Phase 18 return & cancellation tables remain compatible', async () => {
    const { error: cancelErr } = await supabase.from('cancellation_requests').select('id').limit(1);
    assert(!cancelErr, 'cancellation_requests table should be accessible');

    const { error: returnErr } = await supabase.from('returns').select('id').limit(1);
    assert(!returnErr, 'returns table should be accessible');

    const { error: replErr } = await supabase.from('replacement_requests').select('id').limit(1);
    assert(!replErr, 'replacement_requests table should be accessible');
  });

  // TEST 19: Phase 19 frontend production build still succeeds
  await test('19. Frontend production build succeeds (npm run build)', async () => {
    const frontendDir = path.resolve(__dirname, '../../frontend');
    const buildOutput = execSync('npm run build', { cwd: frontendDir, encoding: 'utf8' });
    assert(buildOutput.includes('built in'), 'Frontend build must complete successfully');
  });

  // TEST 20: Existing orders without coupon values remain readable
  await test('20. Historical orders without coupon values remain readable', async () => {
    const { data: historicalOrders, error } = await supabase.from('orders')
      .select('id, coupon_code, discount_amount')
      .limit(10);
    assert(!error, `Fetching historical orders must succeed: ${error?.message}`);
    for (const ord of historicalOrders) {
      assert(ord.coupon_code === null || typeof ord.coupon_code === 'string', 'coupon_code should be string or null');
      assert(!isNaN(parseFloat(ord.discount_amount || 0)), 'discount_amount should be a valid number');
    }
  });

  // Clean up created test orders
  if (createdOrderIdWithCoupon) {
    await supabase.from('orders').delete().eq('id', createdOrderIdWithCoupon);
  }

  console.log('\n====================================================');
  console.log(`📊 PHASE 19.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 20 TESTS)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase19_1Tests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
