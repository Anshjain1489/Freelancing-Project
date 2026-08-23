const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.1: ADMIN DELIVERY NAVIGATION & ROUTE TEST SUITE');
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

  const frontendPath = path.join(__dirname, '../../frontend/src');
  const backendPath = __dirname;

  // TEST 1
  await test('1. DeliveryAdminPage.jsx component exists', async () => {
    const pagePath = path.join(frontendPath, 'pages/admin/DeliveryAdminPage.jsx');
    assert(fs.existsSync(pagePath), 'DeliveryAdminPage.jsx must exist');
    const content = fs.readFileSync(pagePath, 'utf8');
    assert(content.includes('export const DeliveryAdminPage'), 'DeliveryAdminPage must export component');
  });

  // TEST 2
  await test('2. Admin sidebar navigation contains Delivery Management item', async () => {
    const layoutPath = path.join(frontendPath, 'components/layout/AdminLayout.jsx');
    assert(fs.existsSync(layoutPath), 'AdminLayout.jsx must exist');
    const content = fs.readFileSync(layoutPath, 'utf8');
    assert(content.includes('Delivery Management'), 'Sidebar nav items must include Delivery Management');
    assert(content.includes('/admin/delivery'), 'Sidebar nav item target must be /admin/delivery');
  });

  // TEST 3
  await test('3. AppRoutes.jsx registers /admin/delivery & /admin/deliveries routes', async () => {
    const routesPath = path.join(frontendPath, 'routes/AppRoutes.jsx');
    assert(fs.existsSync(routesPath), 'AppRoutes.jsx must exist');
    const content = fs.readFileSync(routesPath, 'utf8');
    assert(content.includes('path="/admin/delivery"'), 'AppRoutes must include /admin/delivery');
    assert(content.includes('DeliveryAdminPage'), 'Route must render DeliveryAdminPage');
  });

  // TEST 4
  await test('4. Route is protected by ProtectedAdminRoute guard', async () => {
    const routesPath = path.join(frontendPath, 'routes/AppRoutes.jsx');
    const content = fs.readFileSync(routesPath, 'utf8');
    assert(content.includes('ProtectedAdminRoute'), 'Admin layout must be wrapped in ProtectedAdminRoute');
    assert(content.includes("user?.role !== 'ADMIN'"), 'Guard must restrict access to ADMIN role');
  });

  // TEST 5
  await test('5. Non-admin roles (CUSTOMER, DELIVERY_PARTNER) are blocked from Admin route', async () => {
    const routesPath = path.join(frontendPath, 'routes/AppRoutes.jsx');
    const content = fs.readFileSync(routesPath, 'utf8');
    assert(content.includes('Navigate to="/"'), 'Non-admin users must be redirected away from admin routes');
  });

  // TEST 6
  await test('6. Frontend endpoints.js matches backend route structure', async () => {
    const endpointsPath = path.join(frontendPath, 'api/endpoints.js');
    assert(fs.existsSync(endpointsPath), 'endpoints.js must exist');
    const content = fs.readFileSync(endpointsPath, 'utf8');
    assert(content.includes('DELIVERY_DASHBOARD'), 'endpoints.js must define DELIVERY_DASHBOARD');
    assert(content.includes('UNASSIGNED_DELIVERY_ORDERS'), 'endpoints.js must define UNASSIGNED_DELIVERY_ORDERS');
    assert(content.includes('ASSIGNED_DELIVERY_ORDERS'), 'endpoints.js must define ASSIGNED_DELIVERY_ORDERS');
  });

  // TEST 7
  await test('7. Backend admin.routes.js supports /deliveries and /delivery paths', async () => {
    const backendRoutesPath = path.join(backendPath, 'routes/admin.routes.js');
    assert(fs.existsSync(backendRoutesPath), 'admin.routes.js must exist');
    const content = fs.readFileSync(backendRoutesPath, 'utf8');
    assert(content.includes('/delivery/dashboard'), 'backend admin routes must support /delivery/dashboard');
    assert(content.includes('/deliveries/dashboard'), 'backend admin routes must support /deliveries/dashboard');
  });

  // TEST 8
  await test('8. Existing Admin navigation items remain intact', async () => {
    const layoutPath = path.join(frontendPath, 'components/layout/AdminLayout.jsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    const items = ['Dashboard', 'Products', 'Categories', 'Orders', 'Inventory', 'Customers', 'Payments', 'Analytics', 'Promotions', 'Activity Logs'];
    items.forEach(item => {
      assert(content.includes(item), `Admin layout must retain ${item}`);
    });
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
