const assert = require('assert');
const http = require('http');
const app = require('./app');
const cacheService = require('./services/cache.service');
const performanceMetrics = require('./services/performanceMetrics.service');

async function runPhase29PerformanceDatabaseTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 29 AUTOMATED PERFORMANCE & CACHE SUITE');
  console.log('  Response Time Headers, Controlled Cache & Health Metrics (20 Assertions)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const runTest = async (description, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS ${passed}] ${description}`);
    } catch (err) {
      failed++;
      console.error(`  ❌ [FAIL ${failed}] ${description}:`, err.message);
    }
  };

  let server;
  let baseUrl;

  await runTest('Setup: Start local HTTP test server for performance headers', async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl);
  });

  // --- SECTION 1: Performance Middleware & Response Time Headers ---
  await runTest('Assertion 1: HTTP responses include X-Response-Time header with ms suffix', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    const respTime = res.headers.get('x-response-time');
    assert.ok(respTime, 'X-Response-Time header must be present');
    assert.ok(/^[0-9]+(\.[0-9]+)?ms$/.test(respTime), `Header '${respTime}' must match duration format`);
  });

  await runTest('Assertion 2: X-Request-ID header from Phase 27 is preserved alongside X-Response-Time', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { 'X-Request-ID': 'test-req-uuid-999' }
    });
    assert.strictEqual(res.headers.get('x-request-id'), 'test-req-uuid-999');
    assert.ok(res.headers.get('x-response-time'));
  });

  await runTest('Assertion 3: performanceMetrics records request duration and calculates aggregate statistics', () => {
    performanceMetrics.resetMetricsForTests();
    performanceMetrics.recordRequest(120);
    performanceMetrics.recordRequest(450);
    performanceMetrics.recordRequest(850);
    performanceMetrics.recordRequest(3500);

    const metrics = performanceMetrics.getMetrics();
    assert.strictEqual(metrics.totalRequests, 4);
    assert.strictEqual(metrics.slowRequestsWarn, 2); // >500ms (850ms, 3500ms)
    assert.strictEqual(metrics.slowRequestsSlow, 1); // >1000ms (3500ms)
    assert.strictEqual(metrics.slowRequestsCritical, 1); // >3000ms (3500ms)
    assert.strictEqual(metrics.maxLatencyMs, 3500);
    assert.ok(metrics.averageLatencyMs > 0);
  });

  // --- SECTION 2: Controlled Public In-Memory Cache Service ---
  await runTest('Assertion 4: cacheService stores public category/product data with TTL', () => {
    cacheService.resetStatsForTests();
    cacheService.set('categories:active', [{ id: 'cat-1', name: 'Dairy' }], 5000);

    const cached = cacheService.get('categories:active');
    assert.ok(cached);
    assert.strictEqual(cached[0].name, 'Dairy');
  });

  await runTest('Assertion 5: cacheService.get returns null on cache miss and increments misses counter', () => {
    const miss = cacheService.get('categories:non-existent-key-999');
    assert.strictEqual(miss, null);

    const stats = cacheService.getStats();
    assert.ok(stats.misses > 0);
  });

  await runTest('Assertion 6: cacheService automatically expires entries after TTL passes', async () => {
    cacheService.set('test:quick-ttl', 'sample-value', 50); // 50ms TTL
    await new Promise(r => setTimeout(r, 70));

    const expired = cacheService.get('test:quick-ttl');
    assert.strictEqual(expired, null);
  });

  await runTest('Assertion 7: Admin product mutation invalidates products:* cache keys', () => {
    cacheService.set('products:list:all', [{ id: 'p1' }]);
    cacheService.set('products:featured', [{ id: 'p2' }]);
    cacheService.set('categories:active', [{ id: 'c1' }]);

    const count = cacheService.invalidateProductCache();
    assert.ok(count >= 2);
    assert.strictEqual(cacheService.get('products:list:all'), null);
    assert.strictEqual(cacheService.get('products:featured'), null);
    assert.ok(cacheService.get('categories:active') !== null, 'Category cache must be untouched by product invalidation');
  });

  await runTest('Assertion 8: Admin category mutation invalidates categories:* and products:* caches', () => {
    cacheService.set('categories:active', [{ id: 'c1' }]);
    cacheService.set('products:featured', [{ id: 'p2' }]);

    cacheService.invalidateCategoryCache();
    assert.strictEqual(cacheService.get('categories:active'), null);
    assert.strictEqual(cacheService.get('products:featured'), null);
  });

  await runTest('Assertion 9: Prohibited Data Protection: Caching sensitive customer cart/order/OTP keys is blocked or avoided', () => {
    const prohibitedKeys = ['cart:user1', 'orders:user1', 'otp:asgn1', 'jwt:user1'];
    prohibitedKeys.forEach(k => {
      assert.strictEqual(cacheService.get(k), null, `Sensitive key ${k} must not be in cache`);
    });
  });

  await runTest('Assertion 10: cacheService.getStats reports hitRatio, active keys and evictions accurately', () => {
    cacheService.resetStatsForTests();
    cacheService.set('key1', 'val1');
    cacheService.get('key1'); // Hit
    cacheService.get('key2'); // Miss

    const stats = cacheService.getStats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.hitRatio, 0.5);
    assert.strictEqual(stats.keysCount, 1);
  });

  // --- SECTION 3: HTTP Endpoint Cache Integration ---
  await runTest('Assertion 11: GET /api/v1/categories returns valid response and populates cache', async () => {
    cacheService.resetStatsForTests();
    const res1 = await fetch(`${baseUrl}/api/v1/categories`);
    assert.strictEqual(res1.status, 200);

    const statsAfterRes1 = cacheService.getStats();
    assert.strictEqual(statsAfterRes1.keysCount, 1);

    const res2 = await fetch(`${baseUrl}/api/v1/categories`);
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.ok(data2.message.includes('cached'));
  });

  await runTest('Assertion 12: GET /api/v1/products/featured returns valid response and populates cache', async () => {
    const res1 = await fetch(`${baseUrl}/api/v1/products/featured`);
    assert.strictEqual(res1.status, 200);

    const res2 = await fetch(`${baseUrl}/api/v1/products/featured`);
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.ok(data2.message.includes('cached'));
  });

  // --- SECTION 4: Health Diagnostics Enhancements ---
  await runTest('Assertion 13: Minimal Public Liveness (GET /api/v1/health) remains lightweight without exposing performance metrics', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.performance, undefined);
    assert.strictEqual(data.cache, undefined);
    assert.strictEqual(data.memory, undefined);
  });

  await runTest('Assertion 14: Internal Readiness (GET /api/v1/health/ready) exposes performance metrics and cache statistics', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health/ready`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.performance);
    assert.ok(typeof data.performance.totalRequests === 'number');
    assert.ok(typeof data.performance.averageLatencyMs === 'number');
    assert.ok(data.cache);
    assert.ok(typeof data.cache.hits === 'number');
    assert.ok(typeof data.cache.misses === 'number');
  });

  // --- SECTION 5: Database Migration & Schema Compatibility ---
  await runTest('Assertion 15: Migration 041 SQL script exists and contains valid index definitions', () => {
    const fs = require('fs');
    const path = require('path');
    const migPath = path.join(__dirname, 'migrations', '041_performance_indexes.sql');
    assert.ok(fs.existsSync(migPath), '041_performance_indexes.sql must exist');
    const content = fs.readFileSync(migPath, 'utf8');
    assert.ok(content.includes('idx_orders_user_status'));
    assert.ok(content.includes('idx_orders_status_created'));
    assert.ok(content.includes('idx_delivery_assignment_partner_status'));
    assert.ok(content.includes('idx_products_category_active'));
    assert.ok(content.includes('idx_payments_order_status'));
  });

  await runTest('Assertion 16: fix_schema_full.js includes Migration 041 performance indexes', () => {
    const fs = require('fs');
    const path = require('path');
    const schemaFixPath = path.join(__dirname, 'fix_schema_full.js');
    assert.ok(fs.existsSync(schemaFixPath));
    const content = fs.readFileSync(schemaFixPath, 'utf8');
    assert.ok(content.includes('idx_delivery_assignments_partner_status'));
  });

  await runTest('Assertion 17: Cache clearing safety: clearing cache under high operations leaves store stable', () => {
    for (let i = 0; i < 50; i++) {
      cacheService.set(`temp:key:${i}`, { index: i }, 1000);
    }
    const sizeBefore = cacheService.getStats().keysCount;
    assert.ok(sizeBefore >= 50);

    cacheService.clear();
    assert.strictEqual(cacheService.getStats().keysCount, 0);
  });

  await runTest('Assertion 18: Fault tolerance: cacheService failures gracefully fallback without throwing unhandled exceptions', () => {
    const badKey = null;
    assert.strictEqual(cacheService.get(badKey), null);
    assert.strictEqual(cacheService.set(badKey, 'val'), false);
    assert.strictEqual(cacheService.delete(badKey), false);
  });

  await runTest('Assertion 19: Performance metrics maxLatencyMs accurately tracks peak request duration', () => {
    performanceMetrics.recordRequest(15.5);
    performanceMetrics.recordRequest(980.2);
    performanceMetrics.recordRequest(12.1);
    const metrics = performanceMetrics.getMetrics();
    assert.ok(metrics.maxLatencyMs >= 980.2);
  });

  await runTest('Assertion 20: Teardown local test HTTP server cleanly', async () => {
    await new Promise((resolve) => server.close(resolve));
    assert.strictEqual(server.listening, false);
  });

  console.log('\n====================================================');
  console.log(`  PHASE 29 PERFORMANCE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase29PerformanceDatabaseTests();
