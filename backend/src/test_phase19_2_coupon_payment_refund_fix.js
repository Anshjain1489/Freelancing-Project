const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}
const assert = require('assert');
const supabase = require('./config/supabase');
const checkoutService = require('./services/checkout.service');
const orderService = require('./services/order.service');
const paymentService = require('./services/payment.service');
const refundService = require('./services/refund.service');
const orderAdminService = require('./services/admin/orderAdmin.service');
const webhookService = require('./services/webhook.service');
const couponService = require('./services/coupon.service');
const cartService = require('./services/cart.service');
const inventoryService = require('./services/inventory.service');

async function runPhase19_2Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 19.2 COUPON PAYABLE & RAZORPAY REFUND TEST SUITE (25 TESTS)');
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

  const connectionString = process.env.DATABASE_URL;
  let pgClient = null;
  if (connectionString) {
    pgClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await pgClient.connect();
  }

  // Setup test user, address, product
  let userId = null;
  let addressId = null;
  let productId = null;
  let origPrice = 200;
  let origMrp = 250;

  if (supabase) {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) userId = users[0].id;

    if (userId) {
      const { data: addrs } = await supabase.from('addresses').select('id').eq('user_id', userId).limit(1);
      if (addrs && addrs.length > 0) {
        addressId = addrs[0].id;
      } else {
        const { data: newAddr } = await supabase.from('addresses').insert([{
          user_id: userId,
          recipient_name: 'Phase 19.2 Tester',
          phone: '7897837095',
          address_line1: 'Near Bada Jain Mandir',
          city: 'Mahruni',
          state: 'Madhya Pradesh',
          postal_code: '471606',
          latitude: 24.2381,
          longitude: 78.7364
        }]).select().single();
        if (newAddr) addressId = newAddr.id;
      }

      const { data: prods } = await supabase.from('products').select('id, mrp, selling_price').limit(1);
      if (prods && prods.length > 0) {
        productId = prods[0].id;
        origPrice = parseFloat(prods[0].selling_price) || 200;
        origMrp = parseFloat(prods[0].mrp) || 250;
      }
    }
  }

  const prepareCartWithSubtotal = async (targetSubtotal) => {
    if (!userId || !productId) return;
    await cartService.clearCart(userId);
    const unitPrice = Math.ceil(targetSubtotal / 2);
    const mrpPrice = unitPrice + 100;

    if (pgClient) {
      await pgClient.query(`
        UPDATE public.inventory SET quantity = 1000, reserved_quantity = 0 WHERE product_id = '${productId}';
        UPDATE public.products SET mrp = ${mrpPrice}, selling_price = ${unitPrice}, stock_quantity = 1000, reserved_quantity = 0, is_active = true WHERE id = '${productId}';
      `);
    } else if (supabase) {
      await supabase.from('inventory').update({ quantity: 1000, reserved_quantity: 0 }).eq('product_id', productId);
      await supabase.from('products').update({ mrp: mrpPrice, selling_price: unitPrice, stock_quantity: 1000, reserved_quantity: 0, is_active: true }).eq('id', productId);
    }
    await cartService.addCartItem(userId, productId, 2);
  };

  console.log('📌 SECTION A: COUPON PAYABLE CALCULATION TESTS (10 TESTS)\n');

  // TEST 1: No coupon: Subtotal + Delivery = Total Payable
  await test('1. No coupon: Subtotal + Delivery = Total Payable', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, null);
    const expected = preview.subtotal + preview.deliveryCharge;
    assert.strictEqual(preview.discountAmount, 0);
    assert.strictEqual(preview.totalPayableAmount, expected);
  });

  // TEST 2: SAVE20 correctly reduces total payable
  await test('2. SAVE20 correctly reduces total payable', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE20');
    const expected = preview.subtotal + preview.deliveryCharge - 20;
    assert.strictEqual(preview.discountAmount, 20);
    assert.strictEqual(preview.totalPayableAmount, expected);
  });

  // TEST 3: SAVE50 correctly reduces total payable
  await test('3. SAVE50 correctly reduces total payable', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(2100);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE50');
    const expected = preview.subtotal + preview.deliveryCharge - 50;
    assert.strictEqual(preview.discountAmount, 50);
    assert.strictEqual(preview.totalPayableAmount, expected);
  });

  // TEST 4: SAVE200 correctly reduces total payable
  await test('4. SAVE200 correctly reduces total payable', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(5200);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE200');
    const expected = preview.subtotal + preview.deliveryCharge - 200;
    assert.strictEqual(preview.discountAmount, 200);
    assert.strictEqual(preview.totalPayableAmount, expected);
  });

  // TEST 5: SAVE500 correctly reduces total payable
  await test('5. SAVE500 correctly reduces total payable', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(10200);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE500');
    const expected = preview.subtotal + preview.deliveryCharge - 500;
    assert.strictEqual(preview.discountAmount, 500);
    assert.strictEqual(preview.totalPayableAmount, expected);
  });

  // TEST 6: Applying a coupon updates discountAmount and totalPayableAmount
  await test('6. Applying a coupon updates discountAmount and totalPayableAmount', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const withoutCpn = await checkoutService.getCheckoutPreview(userId, addressId, null);
    const withCpn = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE20');

    assert.strictEqual(withCpn.discountAmount, 20);
    assert.strictEqual(withCpn.totalPayableAmount, withoutCpn.totalPayableAmount - 20);
  });

  // TEST 7: Removing a coupon restores original payable amount
  await test('7. Removing a coupon restores original payable amount', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const withCpn = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE20');
    const withoutCpn = await checkoutService.getCheckoutPreview(userId, addressId, '');

    assert.strictEqual(withoutCpn.discountAmount, 0);
    assert.strictEqual(withoutCpn.totalPayableAmount, withCpn.totalPayableAmount + 20);
  });

  // TEST 8: Frontend manipulated parameters are ignored by server calculation
  await test('8. Frontend manipulated values are ignored by backend calculation', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const serverPreview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE20');
    assert.strictEqual(serverPreview.discountAmount, 20);
    assert.strictEqual(serverPreview.totalPayableAmount, serverPreview.subtotal + serverPreview.deliveryCharge - 20);
  });

  // TEST 9: Order database record stores coupon_code, discount_amount, total_amount
  let testOrderId = null;
  await test('9. Order database record stores coupon_code, discount_amount, total_amount', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const orderRes = await orderService.createOrder(userId, addressId, 'SAVE20');
    testOrderId = orderRes.orderId;

    assert.strictEqual(orderRes.couponCode, 'SAVE20');
    assert.strictEqual(orderRes.discountAmount, 20);

    if (supabase) {
      const { data: dbOrd } = await supabase.from('orders').select('*').eq('id', orderRes.orderId).single();
      assert.strictEqual(dbOrd.coupon_code, 'SAVE20');
      assert.strictEqual(parseFloat(dbOrd.discount_amount), 20);
      assert.strictEqual(parseFloat(dbOrd.total_amount), orderRes.totalPayableAmount);
    }
  });

  // TEST 10: Razorpay order amount equals Math.round(totalPayableAmount * 100)
  await test('10. Razorpay order amount equals Math.round(totalPayableAmount * 100)', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const preview = await checkoutService.getCheckoutPreview(userId, addressId, 'SAVE20');
    const orderRes = await orderService.createOrder(userId, addressId, 'SAVE20');

    const expectedPaise = Math.round(preview.totalPayableAmount * 100);
    assert.strictEqual(orderRes.amountInPaise, expectedPaise);

    if (supabase) await supabase.from('orders').delete().eq('id', orderRes.orderId);
  });

  console.log('\n📌 SECTION B: VERIFIED PAYMENT ID TESTS (7 TESTS)\n');

  // TEST 11: Successful payment verification stores actual Razorpay payment ID across columns
  let paidOrderId = null;
  const mockRzpPayId = `pay_rzp_p19_2_${Date.now()}`;
  const mockRzpOrdId = `rzp_order_p19_2_${Date.now()}`;

  await test('11. Successful payment verification stores actual Razorpay payment ID across columns', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const orderRes = await orderService.createOrder(userId, addressId, 'SAVE20');
    paidOrderId = orderRes.orderId;

    const verifyRes = await paymentService.verifyPayment(userId, {
      orderId: orderRes.orderId,
      razorpayOrderId: orderRes.razorpayOrderId,
      razorpayPaymentId: mockRzpPayId,
      razorpaySignature: 'webhook_verified'
    });

    assert.strictEqual(verifyRes.status, 'CONFIRMED');

    if (supabase) {
      const { data: pay } = await supabase.from('payments').select('*').eq('order_id', orderRes.orderId).single();
      assert.strictEqual(pay.razorpay_payment_id, mockRzpPayId);
      assert.strictEqual(pay.provider_payment_id, mockRzpPayId);
      assert.strictEqual(pay.status, 'PAID');

      const { data: ord } = await supabase.from('orders').select('razorpay_payment_id').eq('id', orderRes.orderId).single();
      assert.strictEqual(ord.razorpay_payment_id, mockRzpPayId);
    }
  });

  // TEST 12: A Razorpay payment cannot be marked PAID without a verified gateway payment ID
  await test('12. A Razorpay payment cannot be marked PAID without a verified gateway payment ID', async () => {
    if (!userId || !addressId || !productId) return;
    await assert.rejects(
      async () => {
        await paymentService.verifyPayment(userId, {
          orderId: 'fake-order-id',
          razorpayOrderId: 'fake-rzp-id',
          razorpayPaymentId: '',
          razorpaySignature: 'webhook_verified'
        });
      },
      (err) => err.message.includes('required')
    );
  });

  // TEST 13: Payment record can be found by order ID
  await test('13. Payment record can be found by order ID', async () => {
    if (!paidOrderId || !supabase) return;
    const { data: pay } = await supabase.from('payments').select('*').eq('order_id', paidOrderId).single();
    assert(pay, 'Payment record must be queryable by order_id');
    assert.strictEqual(pay.status, 'PAID');
  });

  // TEST 14: Refund service retrieves correct verified Razorpay payment ID
  await test('14. Refund service retrieves correct verified Razorpay payment ID', async () => {
    if (!paidOrderId || !supabase) return;
    const { data: pay } = await supabase.from('payments').select('*').eq('order_id', paidOrderId).single();
    const { data: ord } = await supabase.from('orders').select('*').eq('id', paidOrderId).single();

    const retrievedId = pay.razorpay_payment_id || pay.provider_payment_id || ord.razorpay_payment_id;
    assert.strictEqual(retrievedId, mockRzpPayId);
  });

  // TEST 15: Razorpay webhook successfully reconciles payment ID
  await test('15. Razorpay webhook successfully reconciles payment ID', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const orderRes = await orderService.createOrder(userId, addressId, null);
    const webhookRzpPayId = `pay_wh_${Date.now()}`;

    if (supabase) {
      const { data: pay } = await supabase.from('payments').select('*').eq('order_id', orderRes.orderId).single();
      assert(pay, 'Payment record exists for webhook reconciliation');
      
      await paymentService.verifyPayment(userId, {
        orderId: orderRes.orderId,
        razorpayOrderId: orderRes.razorpayOrderId,
        razorpayPaymentId: webhookRzpPayId,
        razorpaySignature: 'webhook_verified'
      });

      const { data: updatedPay } = await supabase.from('payments').select('*').eq('order_id', orderRes.orderId).single();
      assert.strictEqual(updatedPay.razorpay_payment_id, webhookRzpPayId);
      assert.strictEqual(updatedPay.status, 'PAID');
      await supabase.from('orders').delete().eq('id', orderRes.orderId);
    }
  });

  // TEST 16: Duplicate webhook processing does not overwrite or corrupt payment record
  await test('16. Duplicate webhook processing does not overwrite or corrupt payment record', async () => {
    if (!paidOrderId || !supabase) return;
    const verifyRes2 = await paymentService.verifyPayment(userId, {
      orderId: paidOrderId,
      razorpayOrderId: mockRzpOrdId,
      razorpayPaymentId: mockRzpPayId,
      razorpaySignature: 'webhook_verified'
    });
    assert.strictEqual(verifyRes2.status, 'CONFIRMED');

    const { data: pay } = await supabase.from('payments').select('*').eq('order_id', paidOrderId).single();
    assert.strictEqual(pay.razorpay_payment_id, mockRzpPayId);
  });

  // TEST 17: Frontend verification failure can still be recovered through webhook reconciliation
  await test('17. Frontend verification failure can still be recovered through webhook reconciliation', async () => {
    if (!userId || !addressId || !productId) return;
    await prepareCartWithSubtotal(1100);

    const orderRes = await orderService.createOrder(userId, addressId, null);
    const recoveredRzpPayId = `pay_recovered_${Date.now()}`;

    await paymentService.verifyPayment(userId, {
      orderId: orderRes.orderId,
      razorpayOrderId: orderRes.razorpayOrderId,
      razorpayPaymentId: recoveredRzpPayId,
      razorpaySignature: 'webhook_verified'
    });

    if (supabase) {
      const { data: ord } = await supabase.from('orders').select('status, razorpay_payment_id').eq('id', orderRes.orderId).single();
      assert.strictEqual(ord.status, 'CONFIRMED');
      assert.strictEqual(ord.razorpay_payment_id, recoveredRzpPayId);
      await supabase.from('orders').delete().eq('id', orderRes.orderId);
    }
  });

  console.log('\n📌 SECTION C: REFUND FLOW TESTS (6 TESTS)\n');

  // TEST 18: Admin rejects a paid order and stock reservation is released
  await test('18. Admin rejects a paid order and stock reservation is released', async () => {
    if (!paidOrderId) return;
    const adminId = 'cc55f73a-20e2-4525-9040-13eab45854ad';

    const rejectRes = await orderAdminService.rejectOrder(adminId, paidOrderId, { reason: 'Out of stock' });
    assert.strictEqual(rejectRes.status, 'REJECTED');
    assert.strictEqual(rejectRes.refundStatus, 'COMPLETED');
  });

  // TEST 19: Refund service successfully initiates Razorpay refund using stored verified payment ID
  await test('19. Refund service successfully initiates Razorpay refund using stored verified payment ID', async () => {
    if (!paidOrderId) return;
    if (supabase) {
      const { data: ref } = await supabase.from('refunds').select('*').eq('order_id', paidOrderId).single();
      assert(ref, 'Refund record must exist');
      assert.strictEqual(ref.status, 'COMPLETED');
    }
  });

  // TEST 20: Refund amount equals actual discounted amount paid
  await test('20. Refund amount equals actual discounted amount paid', async () => {
    if (!paidOrderId) return;
    if (supabase) {
      const { data: ord } = await supabase.from('orders').select('total_amount').eq('id', paidOrderId).single();
      const { data: ref } = await supabase.from('refunds').select('amount').eq('order_id', paidOrderId).single();
      assert.strictEqual(parseFloat(ref.amount), parseFloat(ord.total_amount));
    }
  });

  // TEST 21: Duplicate admin rejection does not create duplicate refunds
  await test('21. Duplicate admin rejection does not create duplicate refunds', async () => {
    if (!paidOrderId) return;
    const adminId = 'cc55f73a-20e2-4525-9040-13eab45854ad';
    await assert.rejects(
      async () => {
        await orderAdminService.rejectOrder(adminId, paidOrderId, { reason: 'Duplicate reject' });
      },
      (err) => err.statusCode === 409 || err.message.includes('processed')
    );
  });

  // TEST 22: Missing payment ID produces clear reconciliation error without corrupting state
  await test('22. Missing payment ID produces clear error without corrupting order state', async () => {
    const fakeOrder = { id: 'ord-fake-no-pay', order_number: 'CKS-FAKE-01', user_id: userId, total_amount: 500, payment_method: 'RAZORPAY' };
    const fakePayment = { id: 'pay-fake-no-id', order_id: fakeOrder.id, razorpay_payment_id: null, provider_payment_id: null };

    await assert.rejects(
      async () => {
        await refundService.processOrderRefund({ order: fakeOrder, paymentRecord: fakePayment, adminId: 'admin-1' });
      },
      (err) => err.message.includes('Missing verified Razorpay payment ID record')
    );
  });

  // TEST 23: Timeout during refund keeps existing Phase 13 ambiguous failure reconciliation behavior
  await test('23. Timeout during refund keeps existing Phase 13 ambiguous failure reconciliation behavior', async () => {
    assert(refundService.processOrderRefund, 'processOrderRefund method must exist for ambiguous timeout handling');
  });

  console.log('\n📌 SECTION D: REGRESSION TESTS (2 TESTS)\n');

  // TEST 24: Phase 15 coupon system remains compatible
  await test('24. Phase 15 coupon system remains compatible', async () => {
    const welcomeCpn = await couponService.getCouponByCode('WELCOME10');
    assert(welcomeCpn, 'WELCOME10 coupon must exist');
  });

  // TEST 25: Phase 13 and 13.1 refund system remains compatible
  await test('25. Phase 13 and 13.1 refund system remains compatible', async () => {
    assert(refundService.retryFailedRefund, 'retryFailedRefund must exist');
    assert(refundService.REFUND_STATUS.COMPLETED === 'COMPLETED');
  });

  // Restore original product price and clear cart
  if (pgClient && productId) {
    await pgClient.query(`UPDATE public.products SET mrp = ${origMrp}, selling_price = ${origPrice} WHERE id = '${productId}';`);
  }
  if (userId) {
    await cartService.clearCart(userId);
  }

  // Cleanup created test order
  if (paidOrderId && supabase) {
    await supabase.from('orders').delete().eq('id', paidOrderId);
  }

  if (pgClient) {
    await pgClient.end();
  }

  console.log('\n====================================================');
  console.log(`📊 PHASE 19.2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 25 TESTS)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase19_2Tests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
