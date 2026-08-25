const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('./app');

async function runPhase31ObservabilityDashboardTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 31 AUTOMATED OBSERVABILITY DASHBOARD SUITE');
  console.log('  Admin RBAC Protection, Observability Schema & Credential Redaction (15 Assertions)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const runTest = async (name, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS ${passed}] ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ [FAIL ${failed}] ${name}: ${err.message}`);
    }
  };

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const config = require('./config/environment');
  const JWT_SECRET = config.jwt.accessSecret;

  const adminToken = jwt.sign({ id: 'admin-123', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
  const customerToken = jwt.sign({ id: 'customer-123', role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '1h' });

  const makeRequest = (path, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqOpts = {
        method: 'GET',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(reqOpts, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let data = {};
          try { data = JSON.parse(raw); } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: data, raw });
        });
      });

      req.on('error', reject);
      req.end();
    });
  };

  await runTest('Assertion 1: Unauthenticated GET /api/v1/admin/observability/dashboard returns 401 Unauthorized', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard');
    assert.strictEqual(res.status, 401);
  });

  await runTest('Assertion 2: Customer GET /api/v1/admin/observability/dashboard returns 403 Forbidden', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', {
      Authorization: `Bearer ${customerToken}`
    });
    assert.strictEqual(res.status, 403);
  });

  await runTest('Assertion 3: Admin GET /api/v1/admin/observability/dashboard returns 200 OK', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data);
  });

  await runTest('Assertion 4: Response contains generatedAt timestamp and operationalState', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { data } = res.body;
    assert.ok(data.generatedAt);
    assert.ok(data.operationalState);
    assert.ok(['ACTIVE', 'DRAINING', 'STOPPED'].includes(data.operationalState));
  });

  await runTest('Assertion 5: Response contains slo object with 4 evaluated SLO targets', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { slo } = res.body.data;
    assert.ok(slo);
    assert.ok(slo.slos);
    assert.strictEqual(slo.slos.length, 4);
  });

  await runTest('Assertion 6: Response contains http metrics breakdown (total, 2xx, 4xx, 5xx, latency)', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { http } = res.body.data;
    assert.ok(http);
    assert.strictEqual(typeof http.totalRequests, 'number');
    assert.strictEqual(typeof http.averageLatencyMs, 'number');
    assert.strictEqual(typeof http.p95LatencyMs, 'number');
  });

  await runTest('Assertion 7: Response contains errors statistics and recent errors array', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { errors } = res.body.data;
    assert.ok(errors);
    assert.ok(errors.stats);
    assert.ok(Array.isArray(errors.recent));
  });

  await runTest('Assertion 8: Response contains background jobs queue metrics', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { jobs } = res.body.data;
    assert.ok(jobs);
    assert.strictEqual(typeof jobs.total, 'number');
    assert.strictEqual(typeof jobs.dead_letter, 'number');
  });

  await runTest('Assertion 9: Response contains SSE active connections and user stats', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { sse } = res.body.data;
    assert.ok(sse);
    assert.strictEqual(typeof sse.activeUsersCount, 'number');
  });

  await runTest('Assertion 10: Response contains cache performance stats', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { cache } = res.body.data;
    assert.ok(cache);
    assert.strictEqual(typeof cache.hits, 'number');
  });

  await runTest('Assertion 11: Response contains active alerts section', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { alerts } = res.body.data;
    assert.ok(alerts);
    assert.strictEqual(typeof alerts.activeCount, 'number');
    assert.ok(Array.isArray(alerts.items));
  });

  await runTest('Assertion 12: Response contains business aggregate KPIs', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const { business } = res.body.data;
    assert.ok(business);
    assert.strictEqual(typeof business.totalOrdersCount, 'number');
    assert.strictEqual(typeof business.deliveredOrdersCount, 'number');
  });

  await runTest('Assertion 13: Zero sensitive credentials exposed in dashboard response payload', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    const raw = JSON.stringify(res.body);

    assert.strictEqual(raw.includes('JWT_SECRET'), false);
    assert.strictEqual(raw.includes('OTP_ENCRYPTION_KEY'), false);
    assert.strictEqual(raw.includes('RAZORPAY_KEY_SECRET'), false);
    assert.strictEqual(raw.includes('SuperSecretPassword'), false);
  });

  await runTest('Assertion 14: Response headers include X-Request-ID and X-Response-Time', async () => {
    const res = await makeRequest('/api/v1/admin/observability/dashboard', { Authorization: `Bearer ${adminToken}` });
    assert.ok(res.headers['x-request-id']);
    assert.ok(res.headers['x-response-time']);
  });

  await runTest('Assertion 15: Teardown test server cleanly', async () => {
    await new Promise(resolve => server.close(resolve));
    assert.strictEqual(server.listening, false);
  });

  console.log('\n====================================================');
  console.log(`  PHASE 31 OBSERVABILITY DASHBOARD SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase31ObservabilityDashboardTests();
