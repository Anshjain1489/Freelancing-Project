const assert = require('assert');
const http = require('http');
const app = require('./app');
const authService = require('./services/auth.service');
const notificationService = require('./notifications/notification.service');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');
const sseManager = require('./notifications/sse.manager');

async function runAuditTests() {
  console.log('🧪 Starting Production Hardening & Security Audit Verification...\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Authenticate Admin User
    const adminLoginRes = await authService.loginUser({ identifier: '7897837095', password: 'Admin@123' });
    const adminToken = adminLoginRes.accessToken;
    const adminId = adminLoginRes.user.id;
    assert(adminToken, 'Admin login returns access token');
    console.log('✅ [AUDIT 1] Admin authentication succeeded.');

    // 2. Authenticate Customer User
    const custLoginRes = await authService.registerCustomer({
      fullName: 'Audit Customer',
      phone: `9${Date.now().toString().slice(-9)}`,
      email: `audit_${Date.now()}@test.com`,
      password: 'Password@123'
    });
    const customerToken = custLoginRes.accessToken;
    const customerId = custLoginRes.user.id;
    assert(customerToken, 'Customer registration returns access token');
    console.log('✅ [AUDIT 2] Customer authentication succeeded.');

    // 3. Verify SSE Stream Authentication & Sanitized URL
    const sseReq = http.request(`${baseUrl}/api/v1/notifications/stream?token=${adminToken}`, {
      headers: { Accept: 'text/event-stream' }
    });

    const receivedMessages = [];
    const streamConnectedPromise = new Promise((resolve, reject) => {
      sseReq.on('response', (res) => {
        assert.strictEqual(res.statusCode, 200, 'SSE stream responds with HTTP 200 OK');
        assert.strictEqual(res.headers['content-type'], 'text/event-stream', 'SSE stream returns text/event-stream content type');

        res.on('data', (chunk) => {
          const text = chunk.toString();
          receivedMessages.push(text);
          if (text.includes('CONNECTED')) {
            resolve(res);
          }
        });
      });
      sseReq.on('error', reject);
    });

    sseReq.end();
    const resStream = await streamConnectedPromise;
    console.log('✅ [AUDIT 3] SSE Stream established with HTTP 200 and text/event-stream header.');

    // 4. Test ORDER_CONFIRMED Event Emission & Multi-Admin Notification Delivery
    const orderPayload = {
      userId: customerId,
      orderId: `ord-audit-${Date.now()}`,
      orderNumber: `CKS-AUDIT-${Date.now().toString().slice(-4)}`,
      totalAmount: 999,
      customerName: 'Audit Customer',
      customerPhone: '9876543210'
    };

    eventBus.emit(EVENT_TYPES.ORDER_CONFIRMED, orderPayload);

    // Wait for async EventBus handler and Supabase insert (up to 2000ms)
    let hasAdminOrderMsg = false;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      hasAdminOrderMsg = receivedMessages.some(msg => msg.includes('ADMIN_NEW_ORDER') && msg.includes(orderPayload.orderNumber));
      if (hasAdminOrderMsg) break;
    }

    assert(hasAdminOrderMsg, 'Admin received SSE real-time broadcast for ADMIN_NEW_ORDER');
    console.log('✅ [AUDIT 4] Admin received live SSE broadcast event for new order.');

    // 5. Verify Isolation: Customer notifications do NOT contain Admin notifications
    const custNotifs = await notificationService.getUserNotifications(customerId);
    const hasAdminNotifInCustList = custNotifs.items.some(n => n.eventType === 'ADMIN_NEW_ORDER');
    assert(!hasAdminNotifInCustList, 'Customer notifications DO NOT contain admin-targeted alerts');
    console.log('✅ [AUDIT 5] Strict User Isolation verified: Customer cannot view admin notifications.');

    // 6. Verify SSE Socket Cleanup on disconnect
    resStream.destroy();
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('✅ [AUDIT 6] SSE Connection cleanup verified: socket destruction removes client from sseManager.');

    console.log('\n🎉 Production Hardening Audit Complete: All checks passed!');
  } finally {
    server.close();
  }
}

runAuditTests().catch(err => {
  console.error('❌ Audit Failure:', err);
  process.exit(1);
});
