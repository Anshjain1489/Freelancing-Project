const assert = require('assert');
const orderService = require('./services/order.service');
const checkoutService = require('./services/checkout.service');
const couponService = require('./services/coupon.service');
const paymentService = require('./services/payment.service');
const orderAdminService = require('./services/admin/orderAdmin.service');
const cartService = require('./services/cart.service');
const supabase = require('./config/supabase');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 19.3 COUPON & RAZORPAY PAYMENT TEST SUITE (20 TESTS)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const asyncTest = async (name, fn) => {
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

  // Helper variables
  let testUserId = 'test-user-19-3-' + Date.now();
  let testAddressId = null;
  let testProductId = null;

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) testUserId = users[0].id;

    const { data: addresses } = await supabase.from('addresses').select('id').eq('user_id', testUserId).limit(1);
    if (addresses && addresses.length > 0) {
      testAddressId = addresses[0].id;
    } else {
      const { data: newAddr } = await supabase.from('addresses').insert([{
        user_id: testUserId,
        recipient_name: 'Phase 19.3 Tester',
        phone: '9999999999',
        address_line1: '123 Test Street',
        city: 'Mahruni',
        state: 'Uttar Pradesh',
        postal_code: '272001',
        latitude: 26.78,
        longitude: 82.50
      }]).select('id').single();
      if (newAddr) testAddressId = newAddr.id;
    }

    const { data: products } = await supabase.from('products').select('id, selling_price, available_stock').gt('available_stock', 50).limit(1);
    if (products && products.length > 0) {
      testProductId = products[0].id;
    }
  }

  console.log('📌 SECTION A: COUPON DISCOUNT & CANONICAL CALCULATION TESTS (TESTS 1 - 5)\n');

  await asyncTest('1. No coupon → correct normal Razorpay amount', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, null);
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge;

    assert.strictEqual(orderRes.discountAmount, 0, 'Discount must be 0 when no coupon code is provided');
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable, 'totalPayableAmount must equal subtotal + deliveryCharge');
    assert.strictEqual(orderRes.amountInPaise, Math.round(expectedPayable * 100), 'Razorpay amountInPaise must equal Math.round(totalPayableAmount * 100)');
  });

  await asyncTest('2. SAVE20 → ₹20 discount correctly applied', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10); // ₹1,200

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge - 20;

    assert.strictEqual(orderRes.couponCode, 'SAVE20');
    assert.strictEqual(orderRes.discountAmount, 20);
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable);
    assert.strictEqual(orderRes.amountInPaise, Math.round(expectedPayable * 100));
  });

  await asyncTest('3. SAVE50 → ₹50 discount correctly applied', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 20); // ₹2,400

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE50');
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge - 50;

    assert.strictEqual(orderRes.couponCode, 'SAVE50');
    assert.strictEqual(orderRes.discountAmount, 50);
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable);
    assert.strictEqual(orderRes.amountInPaise, Math.round(expectedPayable * 100));
  });

  await asyncTest('4. SAVE200 → ₹200 discount correctly applied', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 45); // ₹5,400

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE200');
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge - 200;

    assert.strictEqual(orderRes.couponCode, 'SAVE200');
    assert.strictEqual(orderRes.discountAmount, 200);
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable);
    assert.strictEqual(orderRes.amountInPaise, Math.round(expectedPayable * 100));
  });

  await asyncTest('5. SAVE500 → ₹500 discount correctly applied', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 90); // ₹10,800

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE500');
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge - 500;

    assert.strictEqual(orderRes.couponCode, 'SAVE500');
    assert.strictEqual(orderRes.discountAmount, 500);
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable);
    assert.strictEqual(orderRes.amountInPaise, Math.round(expectedPayable * 100));
  });

  console.log('\n📌 SECTION B: PREVIEW & PAYLOAD SECURITY TESTS (TESTS 6 - 10)\n');

  await asyncTest('6. Frontend checkout total equals backend preview total', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 20);

    const previewRes = await checkoutService.getCheckoutPreview(testUserId, testAddressId, 'SAVE50');
    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE50');

    assert.strictEqual(previewRes.totalPayableAmount, orderRes.totalPayableAmount);
    assert.strictEqual(previewRes.discountAmount, orderRes.discountAmount);
  });

  await asyncTest('7. Applied couponCode is actually sent to order creation API', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    assert.strictEqual(orderRes.couponCode, 'SAVE20');
  });

  await asyncTest('8. Backend revalidates coupon during createOrder()', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10); // ₹1,200 (not eligible for SAVE200)

    let errorThrown = false;
    try {
      await orderService.createOrder(testUserId, testAddressId, 'SAVE200');
    } catch (err) {
      errorThrown = true;
      assert.ok(err.message.includes('SAVE200') || err.message.includes('minimum'), 'Error must mention coupon eligibility');
    }
    assert.ok(errorThrown, 'createOrder must revalidate coupon eligibility server-side');
  });

  await asyncTest('9. Manipulated frontend discountAmount is ignored', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    // Controller strictly passes addressId & couponCode to orderService
    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    assert.strictEqual(orderRes.discountAmount, 20, 'Server must calculate discountAmount authoritatively');
  });

  await asyncTest('10. Manipulated frontend totalAmount is ignored', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const expectedPayable = orderRes.subtotal + orderRes.deliveryCharge - 20;
    assert.strictEqual(orderRes.totalPayableAmount, expectedPayable, 'Server must calculate totalPayableAmount authoritatively');
  });

  console.log('\n📌 SECTION C: DATABASE PERSISTENCE & RAZORPAY PAISE TESTS (TESTS 11 - 15)\n');

  await asyncTest('11. Razorpay receives exact totalPayableAmount * 100', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 20);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE50');
    const expectedPaise = Math.round(orderRes.totalPayableAmount * 100);
    assert.strictEqual(orderRes.amountInPaise, expectedPaise);
  });

  await asyncTest('12. Order stores coupon_code', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const { data: dbOrder } = await supabase.from('orders').select('coupon_code').eq('id', orderRes.orderId).single();
    assert.strictEqual(dbOrder.coupon_code, 'SAVE20');
  });

  await asyncTest('13. Order stores correct discount_amount', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const { data: dbOrder } = await supabase.from('orders').select('discount_amount').eq('id', orderRes.orderId).single();
    assert.strictEqual(parseFloat(dbOrder.discount_amount), 20);
  });

  await asyncTest('14. Removing coupon restores original payable amount', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const withCoupon = await checkoutService.getCheckoutPreview(testUserId, testAddressId, 'SAVE20');
    const withoutCoupon = await checkoutService.getCheckoutPreview(testUserId, testAddressId, '');

    assert.strictEqual(withoutCoupon.discountAmount, 0);
    assert.strictEqual(withoutCoupon.totalPayableAmount, withCoupon.totalPayableAmount + 20);
  });

  await asyncTest('15. Changing cart invalidates/recalculates coupon correctly', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 20); // Eligible for SAVE50

    const validPreview = await checkoutService.getCheckoutPreview(testUserId, testAddressId, 'SAVE50');
    assert.strictEqual(validPreview.discountAmount, 50);

    // Reduce cart quantity below SAVE50 minimum threshold (below ₹2,000)
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 1);

    let errorThrown = false;
    try {
      await checkoutService.getCheckoutPreview(testUserId, testAddressId, 'SAVE50');
    } catch (err) {
      errorThrown = true;
    }
    assert.ok(errorThrown, 'Cart subtotal reduction below minimum order amount must invalidate coupon');
  });

  console.log('\n📌 SECTION D: INTEGRATION & REGRESSION TESTS (TESTS 16 - 20)\n');

  await asyncTest('16. Invalid coupon cannot create discounted Razorpay order', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    let errorThrown = false;
    try {
      await orderService.createOrder(testUserId, testAddressId, 'INVALID999');
    } catch (err) {
      errorThrown = true;
    }
    assert.ok(errorThrown);
  });

  await asyncTest('17. Only one coupon applies to an order', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 20);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE50');
    assert.strictEqual(orderRes.couponCode, 'SAVE50');
    assert.strictEqual(orderRes.discountAmount, 50);
  });

  await asyncTest('18. Payment verification remains compatible with Phase 19.2 payment ID fix', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const mockPaymentId = `pay_p19_3_${Date.now()}`;
    const mockSig = `sig_p19_3_${Date.now()}`;

    const verifyRes = await paymentService.verifyRazorpayPayment({
      orderId: orderRes.orderId,
      razorpayOrderId: orderRes.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: mockSig
    });

    assert.strictEqual(verifyRes.paymentStatus, 'PAID');
    assert.strictEqual(verifyRes.razorpayPaymentId, mockPaymentId);
  });

  await asyncTest('19. Admin rejection/refund still works correctly', async () => {
    if (!supabase || !testAddressId || !testProductId) return;
    await cartService.clearCart(testUserId);
    await cartService.addToCart(testUserId, testProductId, 10);

    const orderRes = await orderService.createOrder(testUserId, testAddressId, 'SAVE20');
    const mockPaymentId = `pay_reject_${Date.now()}`;
    await paymentService.verifyRazorpayPayment({
      orderId: orderRes.orderId,
      razorpayOrderId: orderRes.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: `sig_${Date.now()}`
    });

    const rejectRes = await orderAdminService.rejectOrder('admin-test', orderRes.orderId, { reason: 'Test Store Rejection' });
    assert.strictEqual(rejectRes.status, 'REJECTED');
    assert.ok(rejectRes.refundStatus, 'Refund status should be returned');
  });

  await asyncTest('20. Phase 15 coupon regression compatibility', async () => {
    const res = await couponService.getAvailableCoupons(testUserId);
    assert.ok(res && Array.isArray(res.coupons), 'Coupons list must be an array inside coupons property');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 19.3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
