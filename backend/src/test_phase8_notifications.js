const app = require('./app');
const http = require('http');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');

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

async function runPhase8Tests() {
  console.log('🧪 Starting Automated Verification Tests for Phase 8 Notifications & WhatsApp Architecture...\n');
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
    // 1. Customer Authentication
    const regRes = await request('POST', '/api/v1/auth/register', {
      fullName: 'Notification Test User',
      phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `notiftest_${Date.now()}@example.com`,
      password: 'Password@123'
    });
    const token = regRes.body.data.accessToken;
    const userId = regRes.body.data.user.id;

    // 2. Fetch Initial Unread Count & List
    const initialUnreadRes = await request('GET', '/api/v1/notifications/unread-count', null, token);
    assert(initialUnreadRes.status === 200 && typeof initialUnreadRes.body.data.unreadCount === 'number', 'GET /api/v1/notifications/unread-count returns unread count');

    // 3. Trigger Event Bus Event (ORDER_CONFIRMED)
    eventBus.emit(EVENT_TYPES.ORDER_CONFIRMED, {
      userId,
      orderId: 'ord-test-888',
      orderNumber: 'CKS-TEST-888',
      totalAmount: 650,
      customerName: 'Notification Test User',
      customerPhone: '7897837095'
    });

    // Wait 1200ms for event handling and Supabase DB insert
    await new Promise(r => setTimeout(r, 1200));

    // 4. Verify In-App Notification Received
    const listRes = await request('GET', '/api/v1/notifications', null, token);
    assert(listRes.status === 200 && listRes.body.data.items.length > 0, 'EventBus emits ORDER_CONFIRMED and creates customer In-App notification');
    const firstNotif = listRes.body.data.items[0];

    // 5. Mark Single Notification as Read
    const readRes = await request('PATCH', `/api/v1/notifications/${firstNotif.id}/read`, null, token);
    assert(readRes.status === 200, 'PATCH /api/v1/notifications/:id/read marks notification as read');

    // 6. Mark All as Read
    const readAllRes = await request('PATCH', '/api/v1/notifications/read-all', null, token);
    assert(readAllRes.status === 200, 'PATCH /api/v1/notifications/read-all marks all notifications as read');

    // 7. Notification Preferences API
    const prefRes = await request('GET', '/api/v1/notifications/preferences', null, token);
    assert(prefRes.status === 200 && prefRes.body.data.preferences.whatsappOrders === true, 'GET /api/v1/notifications/preferences retrieves preferences');

    const updatePrefRes = await request('PATCH', '/api/v1/notifications/preferences', { whatsappPromotions: true }, token);
    assert(updatePrefRes.status === 200 && updatePrefRes.body.data.preferences.whatsappPromotions === true, 'PATCH /api/v1/notifications/preferences updates user preferences');

    // 8. WhatsApp Hub Verification Webhook GET
    const verifyToken = 'chaudhary_kirana_wa_verify_2026';
    const hubVerifyRes = await request('GET', `/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_challenge_code`);
    assert(hubVerifyRes.status === 200 && hubVerifyRes.raw === 'test_challenge_code', 'GET /api/v1/webhooks/whatsapp verifies Meta hub subscription token');

    console.log(`\n🎉 Phase 8 Verification Complete: ${passed} Passed, ${failed} Failed.`);
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
  runPhase8Tests();
});
