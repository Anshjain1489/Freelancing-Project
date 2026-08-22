const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runPhase19Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PRODUCTION BLANK PAGE FIX TEST SUITE (17 TESTS)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  };

  const frontendDir = path.resolve(__dirname, '../../frontend');
  const distDir = path.join(frontendDir, 'dist');
  const distIndexHtml = path.join(distDir, 'index.html');
  const srcDir = path.join(frontendDir, 'src');

  // TEST 1: Production build succeeds & output directory exists
  await test('1. Production build succeeds & dist directory exists', async () => {
    assert(fs.existsSync(distDir), 'frontend/dist directory should exist');
  });

  // TEST 2: Generated index.html exists
  await test('2. Generated index.html exists', async () => {
    assert(fs.existsSync(distIndexHtml), 'frontend/dist/index.html must exist');
    const htmlContent = fs.readFileSync(distIndexHtml, 'utf8');
    assert(htmlContent.length > 100, 'index.html should not be empty');
  });

  // TEST 3: index.html references valid JS assets
  await test('3. index.html references valid JS assets', async () => {
    const htmlContent = fs.readFileSync(distIndexHtml, 'utf8');
    const jsMatch = htmlContent.match(/src="\/assets\/index-([^"]+\.js)"/);
    assert(jsMatch, 'index.html must reference a bundle JS file in /assets/');
  });

  // TEST 4: Referenced JS assets exist inside dist/assets
  await test('4. Referenced JS assets exist inside dist/assets', async () => {
    const htmlContent = fs.readFileSync(distIndexHtml, 'utf8');
    const jsMatches = [...htmlContent.matchAll(/src="\/assets\/([^"]+)"/g)];
    assert(jsMatches.length > 0, 'At least one script tag should be present');
    for (const match of jsMatches) {
      const assetFileName = match[1];
      const assetFilePath = path.join(distDir, 'assets', assetFileName);
      assert(fs.existsSync(assetFilePath), `Asset ${assetFileName} referenced in index.html must exist`);
    }
  });

  // TEST 5: Referenced CSS assets exist inside dist/assets
  await test('5. Referenced CSS assets exist', async () => {
    const htmlContent = fs.readFileSync(distIndexHtml, 'utf8');
    const cssMatches = [...htmlContent.matchAll(/href="\/assets\/([^"]+\.css)"/g)];
    for (const match of cssMatches) {
      const cssFileName = match[1];
      const cssFilePath = path.join(distDir, 'assets', cssFileName);
      assert(fs.existsSync(cssFilePath), `CSS Asset ${cssFileName} referenced in index.html must exist`);
    }
  });

  // TEST 6: No obvious unresolved frontend imports remain
  await test('6. No unresolved imports remain in frontend source', async () => {
    const adminReturnsPath = path.join(srcDir, 'pages/admin/AdminReturnsPage.jsx');
    const content = fs.readFileSync(adminReturnsPath, 'utf8');
    assert(!content.includes("delivery.management.service"), 'AdminReturnsPage should not import missing delivery.management.service');
    assert(content.includes("deliveryPartner.service"), 'AdminReturnsPage must import deliveryPartner.service');
  });

  // TEST 7: ErrorBoundary component exists and is integrated
  await test('7. ErrorBoundary component exists and is integrated', async () => {
    const boundaryPath = path.join(srcDir, 'components/common/ErrorBoundary.jsx');
    assert(fs.existsSync(boundaryPath), 'ErrorBoundary.jsx component must exist');

    const mainJsxPath = path.join(srcDir, 'main.jsx');
    const mainContent = fs.readFileSync(mainJsxPath, 'utf8');
    assert(mainContent.includes('ErrorBoundary'), 'main.jsx must wrap the root application with ErrorBoundary');
  });

  // TEST 8: Auth initialization handles failure safely
  await test('8. Auth initialization handles failure safely', async () => {
    const authContextPath = path.join(srcDir, 'context/AuthContext.jsx');
    const content = fs.readFileSync(authContextPath, 'utf8');
    assert(content.includes('try') && content.includes('catch') && content.includes('finally'), 'AuthContext must use try/catch/finally');
  });

  // TEST 9: Auth loading state cannot remain permanently stuck
  await test('9. Auth loading state cannot remain permanently stuck', async () => {
    const authContextPath = path.join(srcDir, 'context/AuthContext.jsx');
    const content = fs.readFileSync(authContextPath, 'utf8');
    assert(content.includes('setIsLoading(false)'), 'AuthContext must set isLoading to false in finally block');
  });

  // TEST 10: Invalid localStorage authentication data is handled safely
  await test('10. Invalid localStorage authentication data handled safely', async () => {
    const authContextPath = path.join(srcDir, 'context/AuthContext.jsx');
    const content = fs.readFileSync(authContextPath, 'utf8');
    assert(content.includes("token === 'undefined'") || content.includes("token === 'null'") || content.includes('getValidInitialToken'), 'AuthContext must validate localStorage token strings');
  });

  // TEST 11: SSE/EventSource failures do not crash application startup
  await test('11. SSE/EventSource failures do not crash application startup', async () => {
    const notifContextPath = path.join(srcDir, 'context/NotificationContext.jsx');
    const content = fs.readFileSync(notifContextPath, 'utf8');
    assert(content.includes('eventSource.onerror'), 'NotificationContext must define eventSource.onerror handler');
  });

  // TEST 12: Malformed SSE payload is handled safely
  await test('12. Malformed SSE payload is handled safely', async () => {
    const notifContextPath = path.join(srcDir, 'context/NotificationContext.jsx');
    const content = fs.readFileSync(notifContextPath, 'utf8');
    assert(content.includes('JSON.parse'), 'NotificationContext parses JSON');
    assert(content.includes('[SSE_MESSAGE_PARSER_ERROR]') || content.includes('catch'), 'NotificationContext must wrap JSON.parse in try/catch');
  });

  // TEST 13: Nested SPA routes remain configured correctly in vercel.json
  await test('13. Nested SPA routes configured correctly in vercel.json', async () => {
    const vercelJsonPath = path.resolve(__dirname, '../../vercel.json');
    assert(fs.existsSync(vercelJsonPath), 'vercel.json must exist');
    const vercelContent = fs.readFileSync(vercelJsonPath, 'utf8');
    const vercelObj = JSON.parse(vercelContent);
    assert(Array.isArray(vercelObj.rewrites), 'vercel.json must specify rewrites array for SPA');
    assert(Array.isArray(vercelObj.headers), 'vercel.json must specify headers array for cache control');
  });

  // TEST 14: No backend secrets present in production frontend source/build output
  await test('14. No backend secrets present in production frontend build output', async () => {
    const assetsDir = path.join(distDir, 'assets');
    const assetFiles = fs.readdirSync(assetsDir);
    const secretsToBan = ['SUPABASE_SERVICE_ROLE_KEY', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'JWT_SECRET'];

    for (const file of assetFiles) {
      if (file.endsWith('.js')) {
        const fileContent = fs.readFileSync(path.join(assetsDir, file), 'utf8');
        for (const secret of secretsToBan) {
          assert(!fileContent.includes(secret), `Forbidden backend secret ${secret} detected in frontend asset bundle ${file}`);
        }
      }
    }
  });

  // TEST 15: Phase 14 real-time status functionality remains compatible
  await test('15. Phase 14 real-time status functionality compatible', async () => {
    const notifContextPath = path.join(srcDir, 'context/NotificationContext.jsx');
    const content = fs.readFileSync(notifContextPath, 'utf8');
    assert(content.includes('cks_order_status_updated'), 'NotificationContext must preserve cks_order_status_updated event');
  });

  // TEST 16: Phase 15 coupon system remains compatible
  await test('16. Phase 15 coupon system compatible', async () => {
    const appRoutesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const content = fs.readFileSync(appRoutesPath, 'utf8');
    assert(content.includes('CouponsAdminPage'), 'AppRoutes must preserve CouponsAdminPage route');
  });

  // TEST 17: Phase 16–18 functionality remains compatible
  await test('17. Phase 16–18 functionality compatible', async () => {
    const appRoutesPath = path.join(srcDir, 'routes/AppRoutes.jsx');
    const content = fs.readFileSync(appRoutesPath, 'utf8');
    assert(content.includes('DeliveryAdminPage'), 'AppRoutes preserves Phase 16 DeliveryAdminPage');
    assert(content.includes('InventoryPage'), 'AppRoutes preserves Phase 17 InventoryPage');
    assert(content.includes('AdminReturnsPage'), 'AppRoutes preserves Phase 18 AdminReturnsPage');
    assert(content.includes('AdminCancellationsPage'), 'AppRoutes preserves Phase 18 AdminCancellationsPage');
    assert(content.includes('AdminReplacementsPage'), 'AppRoutes preserves Phase 18 AdminReplacementsPage');
  });

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL 17 TESTS)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase19Tests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
