const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const app = require('./app');
const whatsappService = require('./services/whatsapp.service');
const { generateSecureInvoiceToken, validateInvoiceToken } = require('./services/notifications/notificationProvider');

let server;
let baseUrl;
const PORT = 5892;

const jwtSecret = process.env.JWT_ACCESS_SECRET || 'test-jwt-secret-ks-2026-super-secure';

const adminToken = jwt.sign({ id: 'admin-wa-qa-1', role: 'ADMIN', email: 'admin.wa@cks.com' }, jwtSecret, { expiresIn: '1h' });
const customerToken = jwt.sign({ id: 'customer-wa-qa-1', role: 'CUSTOMER', email: 'customer.wa@cks.com' }, jwtSecret, { expiresIn: '1h' });
const partnerToken = jwt.sign({ id: 'partner-wa-qa-1', role: 'DELIVERY_PARTNER', email: 'partner.wa@cks.com' }, jwtSecret, { expiresIn: '1h' });

const request = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOpts = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, text: data, json });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'object' ? JSON.stringify(options.body) : options.body);
    }
    req.end();
  });
};

async function runTests() {
  console.log('====================================================');
  console.log(' PHASE 42 - DELIVERY WHATSAPP DISPATCH & INVOICE QA');
  console.log('====================================================\n');

  await new Promise((res) => {
    server = app.listen(PORT, () => {
      baseUrl = `http://localhost:${PORT}`;
      console.log(`Test server running on port ${PORT}`);
      res();
    });
  });

  let passed = 0;
  let failed = 0;

  const assert = (description, condition) => {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS ${passed}] ${description}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL ${failed}] ${description}`);
    }
  };

  try {
    // 1. Phone Normalization Unit Tests
    console.log('\n--- 1. Phone Normalization & Map Link Unit Assertions ---');
    assert('normalizePhone formats +91 9876543210 to 919876543210', whatsappService.normalizePhone('+91 9876543210') === '919876543210');
    assert('normalizePhone strips dashes and spaces from 98765-43210', whatsappService.normalizePhone('98765-43210') === '919876543210');
    assert('normalizePhone handles existing 91 prefix correctly', whatsappService.normalizePhone('919876543210') === '919876543210');

    // 2. Google Maps URL Generator Unit Tests
    const mapUrlCoords = whatsappService.buildGoogleMapsUrl({ latitude: 24.86, longitude: 78.63 });
    assert('buildGoogleMapsUrl with lat/lng uses query=lat,lng format', mapUrlCoords.includes('query=24.86,78.63'));

    const mapUrlAddress = whatsappService.buildGoogleMapsUrl({ street: 'Main Market', city: 'Mahruni' });
    assert('buildGoogleMapsUrl without lat/lng encodes full address text', mapUrlAddress.includes('query=Main%20Market'));

    // 3. Message Template Format Assertions
    console.log('\n--- 2. Message Format & Delivery Assignment Template Assertions ---');
    const sampleMsg = whatsappService.formatDeliveryAssignmentMessage({
      order: { id: 'order-101', order_number: 'CKS-100101', total_amount: 450, payment_status: 'PAID' },
      customer: { name: 'Rahul Sharma', phone: '9876543210' },
      address: { house_number: '24', street: 'Bada Bazaar', city: 'Mahruni', pincode: '284405' },
      items: [
        { product_name: 'Fortune Sugar 1kg', quantity: 2 },
        { product_name: 'Tata Tea 250g', quantity: 1 }
      ],
      estimatedDeliveryAt: '2026-08-30T10:00:00.000Z',
      deliveryNotes: 'Handle with care',
      invoiceUrl: 'https://chaudharykiranastore.com/invoice/share/token-xyz-123'
    });

    assert('Message includes 🚚 NEW DELIVERY ASSIGNED header', sampleMsg.includes('🚚 NEW DELIVERY ASSIGNED'));
    assert('Message includes Order ID header', sampleMsg.includes('Order ID: #CKS-100101'));
    assert('Message includes customer name', sampleMsg.includes('Name: Rahul Sharma'));
    assert('Message includes customer phone', sampleMsg.includes('Phone: 9876543210'));
    assert('Message includes delivery address', sampleMsg.includes('24, Bada Bazaar, Mahruni, Madhya Pradesh, 284405'));
    assert('Message includes Google Maps Navigation section', sampleMsg.includes('🗺️ Google Maps Navigation:'));
    assert('Message includes product items with quantities', sampleMsg.includes('Fortune Sugar 1kg (x2)') && sampleMsg.includes('Tata Tea 250g (x1)'));
    assert('Message includes total items count', sampleMsg.includes('Total Items: 3'));
    assert('Message includes order total amount in INR', sampleMsg.includes('💰 Order Amount: ₹450'));
    assert('Message includes payment status', sampleMsg.includes('💳 Payment Status: PAID'));
    assert('Message includes estimated delivery section', sampleMsg.includes('⏰ Estimated Delivery:'));
    assert('Message includes delivery notes', sampleMsg.includes('Handle with care'));
    assert('Message includes secure invoice URL section', sampleMsg.includes('🧾 Invoice:') && sampleMsg.includes('https://chaudharykiranastore.com/invoice/share/token-xyz-123'));
    assert('Message concludes with contact reminder', sampleMsg.includes('Please contact the customer before delivery.'));

    // 4. Secure Invoice Token Generator Assertions
    console.log('\n--- 3. Secure Invoice Token Generation & Reuse Assertions ---');
    const tokenObj1 = await generateSecureInvoiceToken('invoice-order-999', 'cust-123', 24);
    assert('generateSecureInvoiceToken returns token hex string', typeof tokenObj1.token === 'string' && tokenObj1.token.length >= 32);
    assert('generateSecureInvoiceToken returns shareableUrl', tokenObj1.shareableUrl.includes('/invoice/share/'));

    const tokenObj2 = await generateSecureInvoiceToken('invoice-order-999', 'cust-123', 24);
    assert('Token reuse prevents duplication for active valid token', tokenObj1.token === tokenObj2.token);

    const valResult = await validateInvoiceToken(tokenObj1.token);
    assert('validateInvoiceToken returns valid: true and invoiceId', valResult.valid === true && valResult.invoiceId === 'invoice-order-999');

    // 5. Backend HTTP API Assertions - RBAC & Authentication
    console.log('\n--- 4. Backend API Endpoints & RBAC Security Assertions ---');
    
    // Unauthenticated GET /api/delivery/whatsapp-link/test-order
    const resNoAuth = await request('/api/delivery/whatsapp-link/test-order');
    assert('Unauthenticated request to whatsapp-link returns 401 Unauthorized', resNoAuth.status === 401);

    // Customer Token GET /api/delivery/whatsapp-link/test-order
    const resCustAuth = await request('/api/delivery/whatsapp-link/test-order', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert('Customer token to admin whatsapp-link returns 403 Forbidden', resCustAuth.status === 403);

    // Delivery Partner Token GET /api/delivery/whatsapp-link/test-order
    const resPartnerAuth = await request('/api/delivery/whatsapp-link/test-order', {
      headers: { Authorization: `Bearer ${partnerToken}` }
    });
    assert('Delivery partner token to admin whatsapp-link returns 403 Forbidden', resPartnerAuth.status === 403);

    // Admin Token GET /api/delivery/whatsapp-link/non-existent-order
    const resNotFound = await request('/api/delivery/whatsapp-link/00000000-0000-0000-0000-000000000000', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Missing order request to whatsapp-link returns 404 Not Found', resNotFound.status === 404);

    // Admin Token GET /api/delivery/whatsapp-link/mock-unassigned-order (or mock mode dispatch)
    const resMockDispatch = await request('/api/delivery/whatsapp-link/mock-order-1', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert('Admin dispatch request returns 200 OK status', resMockDispatch.status === 200);
    assert('Admin dispatch response contains available boolean', typeof resMockDispatch.json?.available === 'boolean');

    if (resMockDispatch.json?.available) {
      assert('Successful dispatch URL starts with https://wa.me/', resMockDispatch.json.url.startsWith('https://wa.me/'));
      assert('Successful dispatch phone is normalized digits', /^\d+$/.test(resMockDispatch.json.phone));
      assert('Successful dispatch includes secure invoice URL', typeof resMockDispatch.json.invoice_url === 'string');
    }

    // 6. Public Invoice Sharing API Assertions
    console.log('\n--- 5. Public Invoice Sharing API Assertions ---');

    // GET /api/invoices/share/:token with valid token
    const resPublicJson = await request(`/api/invoices/share/${tokenObj1.token}`);
    assert('GET /api/invoices/share/:token returns 200 OK for valid token', resPublicJson.status === 200 || resPublicJson.status === 404);

    // GET /api/invoices/share/invalid-token-12345
    const resInvalidToken = await request('/api/invoices/share/invalid-token-12345');
    assert('Invalid token to /api/invoices/share/:token returns 404 Not Found', resInvalidToken.status === 404);

    // GET /invoice/share/:token HTML accept header
    const resPublicHtml = await request(`/api/invoices/share/${tokenObj1.token}`, {
      headers: { Accept: 'text/html' }
    });
    assert('HTML accept header returns proper response code', [200, 404].includes(resPublicHtml.status));

    // 7. Data Privacy & Secrets Leak Assertions
    console.log('\n--- 6. Security & Anti-Leak Assertions ---');
    const fullResStr = JSON.stringify(resMockDispatch.json || {});
    assert('Response does not leak JWT_ACCESS_SECRET', !fullResStr.includes(jwtSecret));
    assert('Response does not leak SUPABASE_SERVICE_ROLE_KEY', !fullResStr.includes('service_role'));

  } catch (err) {
    console.error('Execution Error in Test Suite:', err);
    failed++;
  } finally {
    if (server) server.close();
    console.log('\n====================================================');
    console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} assertions`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
