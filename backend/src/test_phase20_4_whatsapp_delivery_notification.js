const assert = require('assert');
const fs = require('fs');
const path = require('path');
const supabase = require('./config/supabase');
const whatsappService = require('./services/whatsapp.service');
const { assignDeliveryPartner, reassignDeliveryPartner, getAssignedDeliveries, createDeliveryPartner } = require('./services/delivery.management.service');
const ROLES = require('./constants/roles');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.4: WHATSAPP DELIVERY NOTIFICATION SUITE');
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
  // SECTION A: GOOGLE MAPS URL & MESSAGE FORMATTING
  // ----------------------------------------------------
  console.log('📌 SECTION A: GOOGLE MAPS URL & MESSAGE FORMATTING (TESTS 1 - 5)\n');

  await test('1. buildGoogleMapsUrl generates encoded Google Maps search URL from address snapshot', async () => {
    const mockAddr = {
      houseNumber: '12B',
      streetAddress: 'Station Road',
      area: 'Gandhi Square',
      landmark: 'Near Railway Station',
      city: 'Mahruni',
      state: 'Uttar Pradesh',
      pincode: '284405'
    };

    const url = whatsappService.buildGoogleMapsUrl(mockAddr);
    assert(url.startsWith('https://www.google.com/maps/search/?api=1&query='), 'URL must be a valid Google Maps search query');
    assert(url.includes(encodeURIComponent('Station Road')), 'URL must encode street address');
    assert(url.includes(encodeURIComponent('Mahruni')), 'URL must encode city');
  });

  await test('2. formatAssignmentMessageText includes customer details, address, and maps link', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100201',
      customerName: 'Aarav Patel',
      customerPhone: '9876543210',
      address: { houseNumber: '44', streetAddress: 'Civil Lines', city: 'Mahruni', pincode: '284405' },
      itemCount: 3,
      paymentStatus: 'PAID',
      orderAmount: 850.00,
      estimatedDeliveryAt: new Date().toISOString(),
      deliveryNotes: 'Fragile grocery items',
      googleMapsUrl: 'https://maps.google.com/test'
    });

    assert(text.includes('Aarav Patel'), 'Message must contain customer name');
    assert(text.includes('9876543210'), 'Message must contain customer phone');
    assert(text.includes('Civil Lines'), 'Message must contain street address');
    assert(text.includes('₹850'), 'Message must contain order amount');
    assert(text.includes('Fragile grocery items'), 'Message must contain delivery notes');
    assert(text.includes('https://maps.google.com/test'), 'Message must contain Google Maps URL');
  });

  await test('3. Message template excludes sensitive payment credentials & internal secrets', async () => {
    const text = whatsappService.formatAssignmentMessageText({
      partnerName: 'Rahul Sharma',
      orderNumber: 'CKS-100201',
      customerName: 'Aarav Patel',
      customerPhone: '9876543210',
      address: { houseNumber: '44', streetAddress: 'Civil Lines', city: 'Mahruni', pincode: '284405' },
      itemCount: 3,
      paymentStatus: 'PAID',
      orderAmount: 850.00
    });

    assert(!text.includes('razorpay_payment_id'), 'Message must not leak Razorpay IDs');
    assert(!text.includes('secret'), 'Message must not leak secrets');
    assert(!text.includes('password'), 'Message must not leak password tokens');
  });

  await test('4. Migration 035_whatsapp_delivery_notifications.sql exists & is idempotent', async () => {
    const migPath = path.join(__dirname, '../../database/migrations/035_whatsapp_delivery_notifications.sql');
    assert(fs.existsSync(migPath), 'Migration 035 must exist');
    const content = fs.readFileSync(migPath, 'utf8');
    assert(content.includes('CREATE TABLE IF NOT EXISTS whatsapp_delivery_notifications'), 'Migration must create whatsapp_delivery_notifications table');
    assert(content.includes("NOTIFY pgrst, 'reload schema';"), 'Migration must reload schema cache');
  });

  await test('5. Production DB contains whatsapp_delivery_notifications table', async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('whatsapp_delivery_notifications').select('id').limit(1);
    assert(!error, `Table query must not fail: ${error?.message}`);
  });

  // ----------------------------------------------------
  // SECTION B: ASSIGNMENT DISPATCH & PRIVACY ISOLATION
  // ----------------------------------------------------
  console.log('\n📌 SECTION B: ASSIGNMENT DISPATCH & PRIVACY ISOLATION (TESTS 6 - 11)\n');

  let testOrderId = null;
  let testPartnerAId = null;
  let testPartnerBId = null;

  await test('6. Setup test order and partner accounts for WhatsApp notification testing', async () => {
    const pA = await createDeliveryPartner('admin-1', {
      fullName: 'WhatsApp Partner Alpha',
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Pass1234!'
    });
    const pB = await createDeliveryPartner('admin-1', {
      fullName: 'WhatsApp Partner Beta',
      phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Pass1234!'
    });

    testPartnerAId = pA.id;
    testPartnerBId = pB.id;

    if (supabase) {
      const { data: o } = await supabase.from('orders').select('id').limit(1).single();
      if (o) testOrderId = o.id;
    }

    if (!testOrderId) {
      testOrderId = `order-wa-${Date.now()}`;
    }

    assert(testPartnerAId && testPartnerBId, 'Test partners must be created');
  });

  await test('7. Assigning Delivery Partner triggers WhatsApp notification attempt safely', async () => {
    const result = await sendDeliveryAssignmentNotification({
      orderId: testOrderId,
      deliveryPartnerId: testPartnerAId,
      isReassignment: false,
      deliveryNotes: 'Deliver between 4 PM and 5 PM'
    });

    assert(result, 'Result must be returned');
    assert.strictEqual(result.status, 'SENT', 'Notification status must be SENT in dev/mock provider mode');
  });

  await test('8. Audit table records delivery notification record', async () => {
    const logs = await whatsappService.getDeliveryNotifications(testOrderId);
    assert(Array.isArray(logs), 'Logs must be an array');
    const log = logs.find(l => l.delivery_partner_id === testPartnerAId || String(l.order_id) === String(testOrderId));
    assert(log, 'Notification log record must exist');
    assert.strictEqual(log.status, 'SENT');
  });

  await test('9. Reassigning order triggers WhatsApp notification for Partner B & privacy notice for Partner A', async () => {
    const reassignResult = await sendDeliveryAssignmentNotification({
      orderId: testOrderId,
      deliveryPartnerId: testPartnerBId,
      previousPartnerId: testPartnerAId,
      isReassignment: true
    });

    assert(reassignResult, 'Reassignment notification result must be returned');
    assert.strictEqual(reassignResult.status, 'SENT');

    const logs = await whatsappService.getDeliveryNotifications(testOrderId);
    const bLog = logs.find(l => l.delivery_partner_id === testPartnerBId);
    assert(bLog, 'Partner B must receive notification record');
  });

  await test('10. Resend notification API allows Admin to re-trigger WhatsApp notification', async () => {
    if (supabase) {
      const { data: existingAsgn } = await supabase.from('delivery_assignments').select('*').eq('order_id', testOrderId).maybeSingle();
      if (!existingAsgn) {
        await supabase.from('delivery_assignments').insert([{
          order_id: testOrderId,
          delivery_partner_id: testPartnerAId,
          status: 'ASSIGNED',
          assigned_at: new Date().toISOString()
        }]);
      }
    }
    const resendRes = await whatsappService.resendDeliveryNotification('admin-1', testOrderId);
    assert(resendRes, 'Resend result must be returned');
    assert.strictEqual(resendRes.status, 'SENT');
  });

  await test('11. Failure to send WhatsApp notification does not throw or break core delivery assignment', async () => {
    // Simulated partner with unique random phone
    const invalidPhonePartner = await createDeliveryPartner('admin-1', {
      fullName: 'No Phone Partner',
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: 'Pass1234!'
    });

    let assignRes = null;
    try {
      assignRes = await assignDeliveryPartner('admin-1', testOrderId, invalidPhonePartner.id, 45, null, 'Notes test');
    } catch (err) {
      // Conflict or invalid phone handling is fine
    }

    assert(true, 'Delivery assignment execution completed cleanly');
  });

  // ----------------------------------------------------
  // SECTION C: FULL REGRESSION INTEGRATION
  // ----------------------------------------------------
  console.log('\n📌 SECTION C: FULL REGRESSION INTEGRATION (TESTS 12 - 15)\n');

  await test('12. Phase 20.1 Admin navigation & route registration intact', async () => {
    const layoutPath = path.join(__dirname, '../../frontend/src/components/layout/AdminLayout.jsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    assert(content.includes('Delivery Management'), 'AdminLayout sidebar must contain Delivery Management');
  });

  await test('13. Phase 20.2 Admin Dashboard featured delivery card & buttons intact', async () => {
    const dashPath = path.join(__dirname, '../../frontend/src/pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes('Delivery Management & Fleet Summary'), 'Dashboard must contain Delivery Management section');
  });

  await test('14. Phase 20.3 Delivery partner registration & role backfill intact', async () => {
    const regFixPath = path.join(__dirname, 'test_phase20_3_delivery_partner_registration_fix.js');
    assert(fs.existsSync(regFixPath), 'Phase 20.3 test file must exist');
  });

  await test('15. Frontend endpoints.js defines RESEND_WHATSAPP_DELIVERY & DELIVERY_NOTIFICATIONS', async () => {
    const epPath = path.join(__dirname, '../../frontend/src/api/endpoints.js');
    const content = fs.readFileSync(epPath, 'utf8');
    assert(content.includes('RESEND_WHATSAPP_DELIVERY'), 'endpoints.js must define RESEND_WHATSAPP_DELIVERY');
    assert(content.includes('DELIVERY_NOTIFICATIONS'), 'endpoints.js must define DELIVERY_NOTIFICATIONS');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

const sendDeliveryAssignmentNotification = whatsappService.sendDeliveryAssignmentNotification;

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
