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

async function runPhase4Tests() {
  console.log('🧪 Starting Automated Verification Tests for Phase 4 Backend REST API...\n');
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
    // 1. Health & Readiness
    const healthRes = await request('GET', '/api/v1/health');
    assert(healthRes.status === 200 && healthRes.body.success === true, 'GET /api/v1/health returns 200 OK');

    const readyRes = await request('GET', '/api/v1/health/ready');
    assert(readyRes.status === 200 && readyRes.body.success === true, 'GET /api/v1/health/ready returns 200 OK');

    // 2. Public Categories
    const categoriesRes = await request('GET', '/api/v1/categories');
    assert(categoriesRes.status === 200 && Array.isArray(categoriesRes.body.data.categories), 'GET /api/v1/categories returns categories list');

    const singleCategoryRes = await request('GET', '/api/v1/categories/atta-grains');
    assert(singleCategoryRes.status === 200 && singleCategoryRes.body.data.category.slug === 'atta-grains', 'GET /api/v1/categories/atta-grains returns single category');

    // 3. Public Products, Search, & Details
    const productsRes = await request('GET', '/api/v1/products?page=1&limit=5&sort=price_asc');
    assert(productsRes.status === 200 && Array.isArray(productsRes.body.data.items), 'GET /api/v1/products returns paginated products catalog');

    const featuredRes = await request('GET', '/api/v1/products/featured');
    assert(featuredRes.status === 200 && Array.isArray(featuredRes.body.data.products), 'GET /api/v1/products/featured returns featured products');

    const searchRes = await request('GET', '/api/v1/products/search?q=atta');
    assert(searchRes.status === 200 && Array.isArray(searchRes.body.data.products), 'GET /api/v1/products/search?q=atta returns search results');

    const productDetailRes = await request('GET', '/api/v1/products/aashirvaad-shuddh-chakki-atta-5kg');
    assert(productDetailRes.status === 200 && productDetailRes.body.data.product.name.includes('Aashirvaad'), 'GET /api/v1/products/:slug returns product details');

    // 4. Customer Registration & Login
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regRes = await request('POST', '/api/v1/auth/register', {
      fullName: 'Test Customer',
      phone: testPhone,
      email: `test_${Date.now()}@example.com`,
      password: 'Password@123'
    });
    assert(regRes.status === 201 && regRes.body.data.user.role === 'CUSTOMER', 'POST /api/v1/auth/register creates customer account');

    const customerToken = regRes.body.data.accessToken;

    const loginRes = await request('POST', '/api/v1/auth/login', {
      identifier: testPhone,
      password: 'Password@123'
    });
    assert(loginRes.status === 200 && loginRes.body.data.accessToken, 'POST /api/v1/auth/login succeeds for created user');

    // 5. User Profile View & Update
    const profileRes = await request('GET', '/api/v1/users/me', null, customerToken);
    assert(profileRes.status === 200 && profileRes.body.data.user.fullName === 'Test Customer', 'GET /api/v1/users/me returns profile');

    const updateProfileRes = await request('PATCH', '/api/v1/users/me', { fullName: 'Updated Customer Name' }, customerToken);
    assert(updateProfileRes.status === 200 && updateProfileRes.body.data.user.fullName === 'Updated Customer Name', 'PATCH /api/v1/users/me updates profile');

    // 6. Admin Authentication & Role Protection
    const adminLoginRes = await request('POST', '/api/v1/auth/login', {
      identifier: '7897837095',
      password: 'Admin@123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.data.user.role === 'ADMIN', 'POST /api/v1/auth/login succeeds for Admin owner Akash Chaudhary');

    const adminToken = adminLoginRes.body.data.accessToken;

    // Customer trying to access Admin route should be rejected (403 Forbidden)
    const forbiddenRes = await request('GET', '/api/v1/inventory/alerts/low-stock', null, customerToken);
    assert(forbiddenRes.status === 403, 'Customer attempting Admin API returns 403 Forbidden');

    // Admin accessing Low Stock Alerts
    const lowStockRes = await request('GET', '/api/v1/inventory/alerts/low-stock', null, adminToken);
    assert(lowStockRes.status === 200 && Array.isArray(lowStockRes.body.data.alerts), 'Admin GET /api/v1/inventory/alerts/low-stock returns low stock items');

    console.log(`\n🎉 Verification Complete: ${passed} Passed, ${failed} Failed.`);
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
  runPhase4Tests();
});
