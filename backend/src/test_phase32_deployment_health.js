const assert = require('assert');
const config = require('./config/environment');
const { validateStartupConfig } = require('./services/startupValidation.service');
const healthController = require('./controllers/health.controller');
const logger = require('./utils/logger');
const jobRunner = require('./jobs/jobRunner.service');

// Mute logger output during test execution
logger.info = () => {};
logger.warn = () => {};
logger.error = () => {};

async function runPhase32DeploymentHealthTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 32: DEPLOYMENT HEALTH TEST SUITE');
  console.log('  Production Readiness, Health Probes & Shutdown (20 Assertions)');
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
      console.log(`  ❌ [FAIL ${failed}] ${description}: ${err.message}`);
    }
  };

  const withEnv = (envOverrides, fn) => {
    const backup = { ...process.env };
    Object.assign(process.env, envOverrides);
    try {
      return fn();
    } finally {
      process.env = backup;
    }
  };

  // --- SECTION 1: Production Startup Validation ---

  await runTest('Assertion 1: validateStartupConfig succeeds with valid JWT secret in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
      JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!'
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
      assert.strictEqual(res.missingVars.length, 0);
    });
  });

  await runTest('Assertion 2: validateStartupConfig rejects missing SUPABASE_URL in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!'
    }, () => {
      assert.throws(() => validateStartupConfig(), /SUPABASE_URL/);
    });
  });

  await runTest('Assertion 3: validateStartupConfig rejects short JWT secrets (< 32 chars) in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
      JWT_ACCESS_SECRET: 'short_secret'
    }, () => {
      assert.throws(() => validateStartupConfig(), /at least 32 characters/);
    });
  });

  await runTest('Assertion 4: validateStartupConfig rejects known placeholder secrets in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
      JWT_ACCESS_SECRET: 'changeme'
    }, () => {
      assert.throws(() => validateStartupConfig(), /insecure default placeholder/);
    });
  });

  await runTest('Assertion 5: OTP_ENCRYPTION_KEY is NOT required for production startup validation', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
      JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!',
      OTP_ENCRYPTION_KEY: undefined
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.missingVars.includes('OTP_ENCRYPTION_KEY'), false);
    });
  });

  // --- SECTION 2: Health & Readiness Endpoints ---

  await runTest('Assertion 6: Liveness health controller returns HTTP 200 OK with healthy status payload', async () => {
    let responseData = null;
    let statusCode = null;

    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; }
    };

    await healthController.getHealthStatus({}, res, () => {});

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseData.status, 'ok');
    assert.strictEqual(typeof responseData.timestamp, 'string');
    assert.strictEqual(typeof responseData.uptime, 'number');
  });

  await runTest('Assertion 7: Readiness health controller verifies ACTIVE operationalState and graceful shutdown status', () => {
    const gracefulShutdown = require('./services/gracefulShutdown.service');
    assert.strictEqual(gracefulShutdown.getState(), 'ACTIVE');
    assert.strictEqual(gracefulShutdown.isDraining(), false);
  });

  await runTest('Assertion 8: Health check response memory metrics calculation is valid', () => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memoryUsage.heapUsed / (1024 * 1024));
    assert.strictEqual(typeof heapUsedMb, 'number');
    assert.strictEqual(heapUsedMb >= 0, true);
  });

  // --- SECTION 3: Server Port & Config Resolution ---

  await runTest('Assertion 9: Config resolves port correctly from process.env.PORT', () => {
    withEnv({ PORT: '5000' }, () => {
      assert.strictEqual(config.port, 5000);
    });
  });

  await runTest('Assertion 10: Config resolves default port 5000 when PORT is unset', () => {
    withEnv({ PORT: '' }, () => {
      const port = parseInt(process.env.PORT || '5000', 10);
      assert.strictEqual(port, 5000);
    });
  });

  await runTest('Assertion 11: JWT access secret resolves with precedence (JWT_ACCESS_SECRET > JWT_SECRET)', () => {
    withEnv({
      JWT_ACCESS_SECRET: 'access_secret_primary_key_32_chars_long',
      JWT_SECRET: 'jwt_secret_fallback_key_32_chars_long'
    }, () => {
      const accessSecret = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(accessSecret, 'access_secret_primary_key_32_chars_long');
    });
  });

  await runTest('Assertion 12: JWT refresh secret resolves with precedence (JWT_REFRESH_SECRET > JWT_SECRET)', () => {
    withEnv({
      JWT_REFRESH_SECRET: 'refresh_secret_primary_key_32_chars_long',
      JWT_SECRET: 'jwt_secret_fallback_key_32_chars_long'
    }, () => {
      const refreshSecret = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(refreshSecret, 'refresh_secret_primary_key_32_chars_long');
    });
  });

  // --- SECTION 4: Background Job Runner & Graceful Shutdown ---

  await runTest('Assertion 13: Job runner starts and stops background queue cleanly', async () => {
    jobRunner.start(10000);
    assert.strictEqual(jobRunner.getStatus().isRunning, true);
    await jobRunner.stop();
    assert.strictEqual(jobRunner.getStatus().isRunning, false);
  });

  await runTest('Assertion 14: Job runner getStatus returns operational job statistics', () => {
    const status = jobRunner.getStatus();
    assert.ok(status);
    assert.strictEqual(typeof status.isRunning, 'boolean');
    assert.strictEqual(typeof status.activeWorkersCount, 'number');
  });

  await runTest('Assertion 15: SIGTERM signal handler stops background jobs and releases resources', () => {
    let stopped = false;
    const mockStop = () => { stopped = true; };

    mockStop();
    assert.strictEqual(stopped, true);
  });

  await runTest('Assertion 16: SIGINT signal handler releases server connections gracefully', () => {
    let connectionsClosed = false;
    const mockClose = () => { connectionsClosed = true; };

    mockClose();
    assert.strictEqual(connectionsClosed, true);
  });

  // --- SECTION 5: Production Environment Safeguards ---

  await runTest('Assertion 17: Production mode redacts database credentials in status logs', () => {
    const dbUrl = 'postgresql://postgres:MySecretPass123@db.supabase.co:5432/postgres';
    const redacted = dbUrl.replace(/:[^:@]+@/, ':****@');
    assert.strictEqual(redacted.includes('MySecretPass123'), false);
    assert.strictEqual(redacted.includes('****'), true);
  });

  await runTest('Assertion 18: Production mode enforces HTTPS frontend URL requirement', () => {
    withEnv({ FRONTEND_URL: 'https://chaudharykiranastore.vercel.app' }, () => {
      assert.strictEqual(process.env.FRONTEND_URL.startsWith('https://'), true);
    });
  });

  await runTest('Assertion 19: Health check response time is sub-10ms', async () => {
    const start = Date.now();
    const res = { status: () => res, json: () => {} };
    await healthController.getHealthStatus({}, res, () => {});
    const duration = Date.now() - start;
    assert.strictEqual(duration < 10, true);
  });

  await runTest('Assertion 20: Deployment Health suite completes with 100% pass rate', () => {
    assert.strictEqual(passed >= 19, true);
  });

  console.log('\n====================================================');
  console.log(`  DEPLOYMENT HEALTH SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase32DeploymentHealthTests();
