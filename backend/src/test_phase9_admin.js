const app = require('./app');
const http = require('http');

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

async function runPhase9Tests() {
  console.log('🧪 Starting Automated Verification Tests for Phase 9 Admin Dashboard & Analytics Engine...\n');
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
    // 1. Register normal customer & attempt Admin API access (Security Guard Test)
    const custReg = await request('POST', '/api/v1/auth/register', {
      fullName: 'Normal Customer',
      phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `cust_${Date.now()}@example.com`,
      password: 'Password@123'
    });
    const custToken = custReg.body.data.accessToken;

    const forbiddenRes = await request('GET', '/api/v1/admin/dashboard', null, custToken);
    assert(forbiddenRes.status === 403, 'GET /api/v1/admin/dashboard blocks normal CUSTOMER with 403 Forbidden');

    // 2. Login as Admin
    const adminLoginRes = await request('POST', '/api/v1/auth/login', {
      identifier: '7897837095',
      password: 'Admin@123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data.user.role === 'ADMIN', 'Admin authentication returns ADMIN role token');
    const adminToken = adminLoginRes.body.data.accessToken;

    // 3. Admin Dashboard Overview
    const dashRes = await request('GET', '/api/v1/admin/dashboard?range=today', null, adminToken);
    assert(dashRes.status === 200 && dashRes.body.data.summary.revenue >= 0, 'GET /api/v1/admin/dashboard returns real KPI metrics');

    // 4. Business Intelligence Revenue Analytics
    const revRes = await request('GET', '/api/v1/admin/analytics/revenue?range=7days', null, adminToken);
    assert(revRes.status === 200 && Array.isArray(revRes.body.data.trend), 'GET /api/v1/admin/analytics/revenue returns daily revenue trend');

    // 5. Business Intelligence Top Products
    const topRes = await request('GET', '/api/v1/admin/analytics/top-products', null, adminToken);
    assert(topRes.status === 200 && Array.isArray(topRes.body.data.products), 'GET /api/v1/admin/analytics/top-products returns product performance');

    // 6. Admin Product Creation
    const createProdRes = await request('POST', '/api/v1/admin/products', {
      name: 'Admin Test Basmati Rice 5kg',
      brand: 'Chaudhary Special',
      mrp: 450,
      sellingPrice: 399,
      unit: 'kg',
      stockQuantity: 40,
      lowStockThreshold: 5
    }, adminToken);
    assert(createProdRes.status === 201 && createProdRes.body.data.product.name.includes('Basmati'), 'POST /api/v1/admin/products creates product');
    const newProductId = createProdRes.body.data.product.id;

    // 7. Inventory Overview & Stock Adjustment
    const invRes = await request('GET', '/api/v1/admin/inventory', null, adminToken);
    assert(invRes.status === 200 && Array.isArray(invRes.body.data.items), 'GET /api/v1/admin/inventory lists stock levels');

    const adjustRes = await request('POST', `/api/v1/admin/inventory/${newProductId}/adjust`, {
      quantityChange: 15,
      reason: 'Fresh Shipment Received'
    }, adminToken);
    assert(adjustRes.status === 200, 'POST /api/v1/admin/inventory/:id/adjust performs atomic stock update');

    // 8. Admin Activity Audit Trail
    const actRes = await request('GET', '/api/v1/admin/activity', null, adminToken);
    assert(actRes.status === 200 && actRes.body.data.items.length > 0, 'GET /api/v1/admin/activity returns admin audit logs');

    console.log(`\n🎉 Phase 9 Verification Complete: ${passed} Passed, ${failed} Failed.`);
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
  runPhase9Tests();
});
