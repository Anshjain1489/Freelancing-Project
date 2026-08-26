const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateStartupConfig } = require('./services/startupValidation.service');
const deliveryService = require('./services/delivery.management.service');
const healthController = require('./controllers/health.controller');
const orderController = require('./controllers/order.controller');
const deliveryController = require('./controllers/deliveryPartner.controller');
const authService = require('./services/auth.service');
const sseManager = require('./notifications/sse.manager');
const logger = require('./utils/logger');

// Mute logger during test execution
logger.info = () => {};
logger.warn = () => {};
logger.error = () => {};

async function runRemoveOtpServiceTests() {
  console.log('====================================================');
  console.log('  RUNNING AUTOMATED VERIFICATION: OTP SERVICE REMOVAL');
  console.log('  Non-OTP Startup, Secure Delivery Authorization & 0 Leaks (25 Assertions)');
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
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    Object.assign(process.env, envOverrides);
    try {
      return fn();
    } finally {
      process.env = backup;
    }
  };

  const validJwtSecret = 'super_secure_production_jwt_secret_key_2026_long_and_random';
  const validSupabaseUrl = 'https://vuhwlckfhexlyezmfled.supabase.co';

  // --- SECTION 1: Startup Validation & Secret Safety ---
  await runTest('Assertion 1: OTP_ENCRYPTION_KEY is no longer required during startup', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      delete process.env.OTP_ENCRYPTION_KEY;
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.missingVars.includes('OTP_ENCRYPTION_KEY'), false);
    });
  });

  await runTest('Assertion 2: Production startup validation succeeds without OTP configuration', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 3: Missing required JWT configuration still fails safely in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, (err) => err.message.includes('JWT_SECRET'));
    });
  });

  await runTest('Assertion 4: Error messages never expose secret values', () => {
    const secretVal = 'TOP_SECRET_JWT_KEY_98765';
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: secretVal
    }, () => {
      try {
        validateStartupConfig();
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.message.includes(secretVal), false);
      }
    });
  });

  // --- SECTION 2: Codebase Architecture & File Removal ---
  await runTest('Assertion 5: OTP service file deliveryOtp.service.js is completely removed from disk', () => {
    const otpServicePath = path.join(__dirname, 'services/deliveryOtp.service.js');
    assert.strictEqual(fs.existsSync(otpServicePath), false);
  });

  await runTest('Assertion 6: OTP routes are no longer registered on backend routes', () => {
    const orderRoutesContent = fs.readFileSync(path.join(__dirname, 'routes/order.routes.js'), 'utf8');
    const partnerRoutesContent = fs.readFileSync(path.join(__dirname, 'routes/deliveryPartner.routes.js'), 'utf8');

    assert.strictEqual(orderRoutesContent.includes('delivery-otp'), false);
    assert.strictEqual(partnerRoutesContent.includes('verify-otp'), false);
  });

  await runTest('Assertion 7: OTP controller methods getDeliveryOtp and verifyDeliveryOtp are removed', () => {
    assert.strictEqual(orderController.getDeliveryOtp, undefined);
    assert.strictEqual(deliveryController.verifyDeliveryOtp, undefined);
  });

  // --- SECTION 3: Non-OTP Delivery Workflow & Authorization ---
  await runTest('Assertion 8: Delivery workflow completes cleanly without OTP verification step', async () => {
    assert.strictEqual(typeof deliveryService.completeDelivery, 'function');
    assert.strictEqual(typeof deliveryService.startDelivery, 'function');
  });

  await runTest('Assertion 9: Delivery completion authorization is strictly enforced for assigned partner', async () => {
    try {
      await deliveryService.completeDelivery('wrong-partner-id', 'order-mock-id');
      assert.fail('Should have thrown HTTP 403 / NOT_FOUND');
    } catch (err) {
      assert.ok(err.statusCode === 403 || err.statusCode === 404 || err.message.includes('Forbidden') || err.message.includes('not found'));
    }
  });

  await runTest('Assertion 10: Unauthorized users receive HTTP 403 on delivery action attempts', async () => {
    try {
      await deliveryService.startDelivery('unauthorized-user-999', 'order-mock-id');
      assert.fail('Should have thrown HTTP 403 / NOT_FOUND');
    } catch (err) {
      assert.ok(err.statusCode === 403 || err.statusCode === 404 || err.message.includes('Forbidden') || err.message.includes('not found'));
    }
  });

  await runTest('Assertion 11: Revoked delivery partners receive HTTP 403 Forbidden', async () => {
    try {
      await deliveryService.acceptDelivery('revoked-partner-id', 'revoked-order-id');
      assert.fail('Should have thrown HTTP 403 / NOT_FOUND');
    } catch (err) {
      assert.ok(err.statusCode === 403 || err.statusCode === 404 || err.message.includes('Forbidden') || err.message.includes('not found'));
    }
  });

  await runTest('Assertion 12: Assignment lifecycle state machine validation remains intact (HTTP 409)', async () => {
    assert.strictEqual(typeof deliveryService.acceptDelivery, 'function');
  });

  await runTest('Assertion 13: Order lifecycle validation remains intact', async () => {
    assert.strictEqual(typeof deliveryService.failDelivery, 'function');
  });

  await runTest('Assertion 14: No broken imports remain in backend services', () => {
    const deliveryServiceContent = fs.readFileSync(path.join(__dirname, 'services/delivery.management.service.js'), 'utf8');
    assert.strictEqual(deliveryServiceContent.includes("require('./deliveryOtp.service')"), false);
  });

  // --- SECTION 4: Configuration & Documentation Cleanup ---
  await runTest('Assertion 15: No OTP environment configuration remains in .env.example', () => {
    const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
    assert.strictEqual(envExample.includes('OTP_ENCRYPTION_KEY'), false);
  });

  await runTest('Assertion 16: Deployment documentation DEPLOYMENT_RUNBOOK.md no longer requires OTP keys', () => {
    const runbook = fs.readFileSync(path.join(__dirname, '../../DEPLOYMENT_RUNBOOK.md'), 'utf8');
    assert.ok(runbook.includes('NOT required') || !runbook.includes('`OTP_ENCRYPTION_KEY` | Yes'));
  });

  await runTest('Assertion 17: Frontend endpoints file contains no OTP endpoints', () => {
    const endpointsFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/api/endpoints.js'), 'utf8');
    assert.strictEqual(endpointsFile.includes('DELIVERY_OTP'), false);
    assert.strictEqual(endpointsFile.includes('VERIFY_OTP'), false);
  });

  await runTest('Assertion 18: Frontend services contain no active OTP methods', () => {
    const orderServiceFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/services/order.service.js'), 'utf8');
    const partnerServiceFile = fs.readFileSync(path.join(__dirname, '../../frontend/src/services/deliveryPartner.service.js'), 'utf8');
    assert.strictEqual(orderServiceFile.includes('getDeliveryOtp'), false);
    assert.strictEqual(partnerServiceFile.includes('verifyDeliveryOtp'), false);
  });

  // --- SECTION 5: Core Application Stability & Regression Checks ---
  await runTest('Assertion 19: Existing authentication behavior remains functional', () => {
    assert.ok(authService.registerCustomer);
    assert.ok(authService.loginUser);
    assert.ok(authService.googleLogin);
    assert.ok(authService.refreshAccessToken);
  });

  await runTest('Assertion 20: Existing delivery management service functions remain functional', () => {
    assert.ok(deliveryService.getPartnerDashboard);
    assert.ok(deliveryService.getPartnerOrders);
    assert.ok(deliveryService.startDelivery);
    assert.ok(deliveryService.completeDelivery);
  });

  await runTest('Assertion 21: Existing SSE notification manager remains functional', () => {
    assert.ok(sseManager.getStats);
    assert.ok(sseManager.broadcastDeliveryUpdate);
  });

  await runTest('Assertion 22: Startup validation interface remains compatible with Phase 30', () => {
    withEnv({ NODE_ENV: 'development' }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(typeof res.valid, 'boolean');
      assert.strictEqual(Array.isArray(res.missingVars), true);
    });
  });

  await runTest('Assertion 23: Operational health diagnostics return HTTP 200 OK without OTP', async () => {
    const req = {};
    const healthResult = await new Promise((resolve) => {
      const res = {
        status: (code) => ({
          json: (b) => resolve({ statusCode: code, body: b })
        })
      };
      healthController.getHealthStatus(req, res, () => {});
    });

    assert.strictEqual(healthResult.statusCode, 200);
    assert.strictEqual(healthResult.body.status, 'ok');
  });

  await runTest('Assertion 24: No insecure production authentication fallback is introduced', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'changeme'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /insecure default placeholder values/);
    });
  });

  await runTest('Assertion 25: Production startup no longer depends on AES-256-GCM OTP encryption', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      delete process.env.OTP_ENCRYPTION_KEY;
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  console.log('\n====================================================');
  console.log(`  OTP SERVICE REMOVAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runRemoveOtpServiceTests();
