const app = require('./app');
const http = require('http');
const deliveryService = require('./services/delivery.service');

let server;
let baseUrl;

async function request(method, path, body = null, token = null) {
  const url = new URL(path, baseUrl);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase7Tests() {
  console.log('🧪 Starting Automated Verification Tests for Phase 7 Razorpay Payment & Order Pipeline...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Delivery Charge Logic Verification
    const cases = [
      { d: 0.5, expected: 10 },
      { d: 1.0, expected: 10 },
      { d: 1.1, expected: 20 },
      { d: 1.5, expected: 20 },
      { d: 2.0, expected: 20 },
      { d: 2.1, expected: 30 },
      { d: 3.0, expected: 30 },
      { d: 5.0, expected: 50 }
    ];

    for (const c of cases) {
      const fee = deliveryService.calculateDeliveryFee(c.d);
      assert(fee.deliveryCharge === c.expected, `Delivery fee for ${c.d} KM is ₹${fee.deliveryCharge} (Expected ₹${c.expected})`);
    }

    // 2. Customer Registration & Login
    const regRes = await request('POST', '/api/v1/auth/register', {
      fullName: 'Order Test Customer',
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `ordertest_${Date.now()}@example.com`,
      password: 'Password@123'
    });
    const token = regRes.body.data.accessToken;
    const userId = regRes.body.data.user.id;

    // Add address for customer
    const addrRes = await request('POST', '/api/v1/addresses', {
      recipientName: 'Order Test Customer',
      phone: '9876543210',
      addressLine1: 'Near Bada Jain Mandir',
      city: 'Mahruni',
      state: 'Uttar Pradesh',
      postalCode: '274702',
      isDefault: true
    }, token);
    const addressId = addrRes.body.data.address.id;

    // Add item to cart
    await request('POST', '/api/v1/cart/items', {
      productId: 'a1000000-0000-0000-0000-000000000001',
      quantity: 2
    }, token);

    // 3. Checkout Preview (Backend calculation)
    const previewRes = await request('POST', '/api/v1/checkout/preview', { addressId }, token);
    assert(previewRes.status === 200 && previewRes.body.data.totalAmount > 0, 'POST /api/v1/checkout/preview returns backend-calculated prices and delivery fee');

    // 4. Order Creation
    const orderRes = await request('POST', '/api/v1/orders', { addressId }, token);
    assert(orderRes.status === 201 && orderRes.body.data.razorpayOrderId, 'POST /api/v1/orders creates pending order and Razorpay payload');
    const orderData = orderRes.body.data;

    // 5. Invalid Signature Rejection
    const invalidVerifyRes = await request('POST', '/api/v1/payments/razorpay/verify', {
      orderId: orderData.orderId,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: 'pay_invalid',
      razorpaySignature: 'invalid_sig'
    }, token);
    assert(invalidVerifyRes.status === 400, 'POST /api/v1/payments/razorpay/verify rejects invalid payment signature');

    // 6. Valid Payment Verification & Order Confirmation
    const crypto = require('crypto');
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'HI6nYMK6VG8gZg0WEqggkJHW';
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const generatedSig = crypto.createHmac('sha256', razorpaySecret)
      .update(`${orderData.razorpayOrderId}|${mockPaymentId}`)
      .digest('hex');

    const validVerifyRes = await request('POST', '/api/v1/payments/razorpay/verify', {
      orderId: orderData.orderId,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: generatedSig
    }, token);
    assert(validVerifyRes.status === 200 && validVerifyRes.body.data.status === 'CONFIRMED', 'POST /api/v1/payments/razorpay/verify confirms order upon valid payment');

    // 7. Idempotency Test: Repeat Verification Call
    const repeatVerifyRes = await request('POST', '/api/v1/payments/razorpay/verify', {
      orderId: orderData.orderId,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: mockPaymentId,
      razorpaySignature: generatedSig
    }, token);
    assert(repeatVerifyRes.status === 200, 'Repeat payment verification call is idempotent and safe');

    // 8. Order Details & History Retrieval
    const getOrderRes = await request('GET', `/api/v1/orders/${orderData.orderId}`, null, token);
    assert(getOrderRes.status === 200 && getOrderRes.body.data.order.orderNumber === orderData.orderNumber, 'GET /api/v1/orders/:id returns confirmed order details');

    console.log(`\n🎉 Phase 7 Verification Complete: ${passed} Passed, ${failed} Failed.`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('💥 Test Execution Error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

server = app.listen(0, () => {
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  runPhase7Tests();
});
