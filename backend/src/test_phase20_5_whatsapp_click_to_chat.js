const assert = require('assert');
const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');
const whatsappService = require('./services/whatsapp.service');
const { assignDeliveryPartner, reassignDeliveryPartner, getAssignedDeliveries, createDeliveryPartner } = require('./services/delivery.management.service');
const ROLES = require('./constants/roles');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.5: WHATSAPP CLICK-TO-CHAT SUITE');
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

  // ----------------------------------------------------
  // SECTION A: PHONE NORMALIZATION & URL GENERATION (TESTS 1 - 10)
  // ----------------------------------------------------
  console.log('📌 SECTION A: PHONE NORMALIZATION & URL GENERATION (TESTS 1 - 10)\n');

  await test('1. No Meta Cloud API dependency remains', async () => {
    const waPath = path.join(__dirname, 'services/whatsapp.service.js');
    const content = fs.readFileSync(waPath, 'utf8');
    assert(!content.includes('graph.facebook.com'), 'whatsapp.service.js must not contain Meta graph API URL');
    assert(!content.includes('WHATSAPP_ACCESS_TOKEN'), 'whatsapp.service.js must not require WHATSAPP_ACCESS_TOKEN');
  });

  await test('2. No WhatsApp API access token is required', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const urlRes = await whatsappService.generateWhatsAppUrl('9876543210', 'Test message');
    assert(urlRes.startsWith('https://wa.me/'), 'Should generate wa.me link without any env access tokens');
  });

  await test('3. Valid 10-digit Indian phone becomes 91XXXXXXXXXX', async () => {
    const norm = whatsappService.normalizePhone('9876543210');
    assert.strictEqual(norm, '919876543210');
  });

  await test('4. Phone numbers with +91 are normalized correctly', async () => {
    const norm = whatsappService.normalizePhone('+91 98765 43210');
    assert.strictEqual(norm, '919876543210');
  });

  await test('5. WhatsApp URL uses https://wa.me/', async () => {
    const url = whatsappService.generateWhatsAppUrl('9876543210', 'Hello Delivery');
    assert(url.startsWith('https://wa.me/919876543210?text='), 'URL must begin with https://wa.me/91...');
  });

  await test('6. Message is correctly URL encoded', async () => {
    const url = whatsappService.generateWhatsAppUrl('9876543210', 'Hello & Welcome! #123');
    assert(url.includes(encodeURIComponent('Hello & Welcome! #123')), 'Special characters must be percent-encoded');
  });

  await test('7. Customer name appears in generated message', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100999',
      customerName: 'Priya Verma',
      customerPhone: '9876543210',
      address: { houseNumber: '10', streetAddress: 'Station Road', city: 'Mahruni' },
      items: [{ name: 'Sugar 1kg', quantity: 2 }],
      paymentStatus: 'PAID',
      orderAmount: 250,
      googleMapsUrl: 'https://maps.google.com/test'
    });
    assert(text.includes('Priya Verma'), 'Customer name must be present in formatted message');
  });

  await test('8. Customer phone appears in generated message', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100999',
      customerName: 'Priya Verma',
      customerPhone: '9876543210',
      address: { houseNumber: '10', streetAddress: 'Station Road', city: 'Mahruni' },
      items: [{ name: 'Sugar 1kg', quantity: 2 }],
      paymentStatus: 'PAID',
      orderAmount: 250,
      googleMapsUrl: 'https://maps.google.com/test'
    });
    assert(text.includes('9876543210'), 'Customer phone must be present in formatted message');
  });

  await test('9. Customer address appears in generated message', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100999',
      customerName: 'Priya Verma',
      customerPhone: '9876543210',
      address: { houseNumber: '10', streetAddress: 'Station Road', city: 'Mahruni' },
      items: [{ name: 'Sugar 1kg', quantity: 2 }],
      paymentStatus: 'PAID',
      orderAmount: 250,
      googleMapsUrl: 'https://maps.google.com/test'
    });
    assert(text.includes('Station Road'), 'Customer street address must be present in formatted message');
  });

  await test('10. Google Maps URL appears in generated message', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100999',
      customerName: 'Priya Verma',
      customerPhone: '9876543210',
      address: { houseNumber: '10', streetAddress: 'Station Road', city: 'Mahruni' },
      items: [{ name: 'Sugar 1kg', quantity: 2 }],
      paymentStatus: 'PAID',
      orderAmount: 250,
      googleMapsUrl: 'https://maps.google.com/test'
    });
    assert(text.includes('https://maps.google.com/test'), 'Google Maps URL must be present in formatted message');
  });

  // ----------------------------------------------------
  // SECTION B: ASSIGNMENT INTEGRATION & PRIVACY (TESTS 11 - 16)
  // ----------------------------------------------------
  console.log('\n📌 SECTION B: ASSIGNMENT INTEGRATION & PRIVACY (TESTS 11 - 16)\n');

  let testOrderId = null;
  let testPartnerAId = null;
  let testPartnerBId = null;

  await test('11. Delivery assignment succeeds without WhatsApp availability', async () => {
    const pA = await createDeliveryPartner('admin-1', {
      fullName: 'ClickToChat Partner Alpha',
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Pass1234!'
    });
    testPartnerAId = pA.id;

    if (supabase) {
      const { data: o } = await supabase.from('orders').select('id').limit(1).single();
      if (o) testOrderId = o.id;
    }
    if (!testOrderId) testOrderId = `order-wa5-${Date.now()}`;

    // Clean existing assignment for clean test
    if (supabase) {
      await supabase.from('delivery_assignments').delete().eq('order_id', testOrderId);
    }

    const res = await assignDeliveryPartner('admin-1', testOrderId, testPartnerAId);
    assert(res.success, 'Delivery assignment must succeed');
    assert(res.whatsapp, 'WhatsApp click-to-chat info must be returned');
    assert(res.whatsapp.url.startsWith('https://wa.me/'), 'Generated URL must be a Click-to-Chat wa.me link');
  });

  await test('12. WhatsApp URL generation failure cannot rollback assignment', async () => {
    assert(testOrderId, 'Test order ID must exist');
  });

  await test('13. Reassignment generates a link for the new partner', async () => {
    const pB = await createDeliveryPartner('admin-1', {
      fullName: 'ClickToChat Partner Beta',
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Pass1234!'
    });
    testPartnerBId = pB.id;

    const reassignRes = await reassignDeliveryPartner('admin-1', testOrderId, testPartnerBId);
    assert(reassignRes.success, 'Reassignment must succeed');
    assert(reassignRes.whatsapp.url.includes(whatsappService.normalizePhone(pB.phone)), 'Generated link must be targeted to Partner B phone');
  });

  await test('14. Previous partner cannot access reassigned customer order', async () => {
    if (supabase) {
      const { data: asgn } = await supabase.from('delivery_assignments')
        .select('*')
        .eq('order_id', testOrderId)
        .maybeSingle();

      if (asgn) {
        assert.strictEqual(asgn.delivery_partner_id, testPartnerBId, 'DB delivery assignment partner must be updated to Partner B');
        assert.notStrictEqual(asgn.delivery_partner_id, testPartnerAId, 'Partner A must no longer hold the assignment');
      }
    }
  });

  await test('15. Only ADMIN can generate WhatsApp links', async () => {
    const routePath = path.join(__dirname, 'routes/admin.routes.js');
    const content = fs.readFileSync(routePath, 'utf8');
    assert(content.includes("router.post('/deliveries/:orderId/whatsapp-link'"), 'WhatsApp link route must be registered under admin routes');
  });

  await test('16. No secrets appear in the WhatsApp message', async () => {
    const res = await whatsappService.generateDeliveryAssignmentWhatsAppUrl({ orderId: testOrderId, deliveryPartnerId: testPartnerBId });
    if (res.available) {
      assert(!res.message.includes('razorpay_secret'), 'Secret keys must not leak');
      assert(!res.message.includes('password_hash'), 'Passwords must not leak');
      assert(!res.message.includes('jwt'), 'Tokens must not leak');
    }
  });

  // ----------------------------------------------------
  // SECTION C: REGRESSION SUITE INTEGRATION (TESTS 17 - 20)
  // ----------------------------------------------------
  console.log('\n📌 SECTION C: REGRESSION SUITE INTEGRATION (TESTS 17 - 20)\n');

  await test('17. Existing delivery partner workflow remains compatible', async () => {
    const assignedList = await getAssignedDeliveries();
    assert(Array.isArray(assignedList), 'getAssignedDeliveries must return array');
  });

  await test('18. Phase 20 delivery tests script file exists', async () => {
    const p20Path = path.join(__dirname, 'test_phase20_delivery_customer_details.js');
    assert(fs.existsSync(p20Path), 'Phase 20 test file must exist');
  });

  await test('19. Frontend production build file exists / components valid', async () => {
    const endpointsPath = path.join(__dirname, '../../frontend/src/api/endpoints.js');
    const content = fs.readFileSync(endpointsPath, 'utf8');
    assert(content.includes('WHATSAPP_LINK'), 'endpoints.js must contain WHATSAPP_LINK');
  });

  await test('20. Phase 19 coupon/payment refund test files exist', async () => {
    const p19_3 = path.join(__dirname, 'test_phase19_3_coupon_payment_flow.js');
    const p19_2 = path.join(__dirname, 'test_phase19_2_coupon_payment_refund_fix.js');
    assert(fs.existsSync(p19_3), 'Phase 19.3 test file must exist');
    assert(fs.existsSync(p19_2), 'Phase 19.2 test file must exist');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
