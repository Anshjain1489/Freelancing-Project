const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.2: ADMIN DASHBOARD DELIVERY BUTTON SUITE');
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

  // TEST 1
  await test('1. Active Admin Dashboard component (DashboardPage.jsx) exists', async () => {
    const dashPath = path.join(frontendPath, 'pages/admin/DashboardPage.jsx');
    assert(fs.existsSync(dashPath), 'DashboardPage.jsx must exist');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes('export const DashboardPage'), 'DashboardPage must export component');
  });

  // TEST 2
  await test('2. Dashboard contains prominent Delivery Management button and summary section', async () => {
    const dashPath = path.join(frontendPath, 'pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes('Delivery Management & Fleet Summary'), 'Dashboard must display Delivery Management section');
    assert(content.includes('/admin/delivery'), 'Dashboard must navigate to /admin/delivery');
  });

  // TEST 3
  await test('3. Dashboard fetches delivery stats with graceful fallback error safety', async () => {
    const dashPath = path.join(frontendPath, 'pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes('getAdminDeliveryDashboard'), 'Dashboard must fetch getAdminDeliveryDashboard');
    assert(content.includes('Promise.allSettled') || content.includes('catch'), 'API call must use graceful fallback error safety');
  });

  // TEST 4
  await test('4. DeliveryAdminPage.jsx is reused without creating duplicate pages', async () => {
    const adminPagesDir = path.join(frontendPath, 'pages/admin');
    const files = fs.readdirSync(adminPagesDir);
    const deliveryPages = files.filter(f => f.toLowerCase().includes('delivery'));
    assert.strictEqual(deliveryPages.length, 1, 'Only one DeliveryAdminPage.jsx must exist in pages/admin');
    assert.strictEqual(deliveryPages[0], 'DeliveryAdminPage.jsx', 'Must be DeliveryAdminPage.jsx');
  });

  // TEST 5
  await test('5. Quick Action section includes Delivery Management button', async () => {
    const dashPath = path.join(frontendPath, 'pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    assert(content.includes('Delivery Management'), 'Quick actions must include Delivery Management');
    assert(content.includes('icon={Truck}'), 'Button must use Truck icon');
  });

  // TEST 6
  await test('6. Existing Admin Dashboard buttons remain intact', async () => {
    const dashPath = path.join(frontendPath, 'pages/admin/DashboardPage.jsx');
    const content = fs.readFileSync(dashPath, 'utf8');
    const actions = ['Add New Product', 'Manage Orders', 'Update Stock', 'Full Analytics Report'];
    actions.forEach(act => {
      assert(content.includes(act), `Dashboard must retain quick action: ${act}`);
    });
  });

  // TEST 7
  await test('7. Admin layout sidebars retain Delivery Management navigation link', async () => {
    const layoutPath = path.join(frontendPath, 'components/layout/AdminLayout.jsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    assert(content.includes('Delivery Management'), 'AdminLayout sidebar must retain Delivery Management');
    assert(content.includes('/admin/delivery'), 'AdminLayout sidebar target must be /admin/delivery');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
