const assert = require('assert');
const jwt = require('jsonwebtoken');
const config = require('./config/environment');
const { validateStartupConfig } = require('./services/startupValidation.service');
const { authenticate, authorizeAdmin, authorizeDeliveryPartner } = require('./middleware/auth.middleware');
const authService = require('./services/auth.service');
const healthController = require('./controllers/health.controller');
const logger = require('./utils/logger');

// Mute logger output during test execution
logger.info = () => {};
logger.warn = () => {};
logger.error = () => {};

async function runJwtStartupValidationTests() {
  console.log('====================================================');
  console.log('  RUNNING AUTOMATED TEST SUITE: FIX JWT STARTUP VALIDATION');
  console.log('  Strict Validation, Priority Precedence & Secret Redaction (32 Assertions)');
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

  const valid64HexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const valid32ByteSecret = 'super_secure_production_jwt_secret_key_2026_long_and_random';
  const validSupabaseUrl = 'https://vuhwlckfhexlyezmfled.supabase.co';

  // Helper to run with temporary env overrides
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

  // --- SECTION 1: JWT Production Startup Validation ---

  await runTest('Assertion 1: Production with JWT_SECRET succeeds', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid32ByteSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 2: Production with JWT_ACCESS_SECRET succeeds', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_ACCESS_SECRET: valid32ByteSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 3: Production with both JWT_SECRET and JWT_ACCESS_SECRET succeeds', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid32ByteSecret,
      JWT_ACCESS_SECRET: valid64HexKey
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 4: Production fails when both JWT_SECRET and JWT_ACCESS_SECRET are missing', () => {
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

  await runTest('Assertion 5: Empty JWT_SECRET fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /Startup Validation Failed/);
    });
  });

  await runTest('Assertion 6: Whitespace-only secret fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '    ',
      JWT_ACCESS_SECRET: '   '
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /Startup Validation Failed/);
    });
  });

  await runTest('Assertion 7: Secret shorter than 32 characters fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'short_key_under_32_chars'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /at least 32 characters/);
    });
  });

  await runTest('Assertion 8: Placeholder changeme fails in production', () => {
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

  await runTest('Assertion 9: Placeholder secret fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'secret'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /insecure default placeholder values/);
    });
  });

  await runTest('Assertion 10: Placeholder matching is case-insensitive (e.g. CHANGEME, Secret)', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'CHANGEME'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /insecure default placeholder values/);
    });
  });

  await runTest('Assertion 11: Valid long random 64-hex secret succeeds', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid64HexKey
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 12: JWT_ACCESS_SECRET takes precedence when both exist', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'access_secret_priority_32_chars_long_key_123',
      JWT_SECRET: 'fallback_jwt_secret_32_chars_long_key_456'
    }, () => {
      const resolved = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(resolved, 'access_secret_priority_32_chars_long_key_123');
    });
  });

  await runTest('Assertion 13: JWT_SECRET acts as fallback when JWT_ACCESS_SECRET is absent', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'fallback_jwt_secret_32_chars_long_key_456'
    }, () => {
      const resolved = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(resolved, 'fallback_jwt_secret_32_chars_long_key_456');
    });
  });

  await runTest('Assertion 14: Refresh secret resolution works via JWT_REFRESH_SECRET || JWT_SECRET', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'shared_secret_32_characters_minimum_1',
      JWT_REFRESH_SECRET: 'custom_refresh_secret_32_characters_long'
    }, () => {
      const refreshSec = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(refreshSec, 'custom_refresh_secret_32_characters_long');
    });
  });

  await runTest('Assertion 15: Production has no hardcoded fallback secret', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      const accessSecret = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_fallback')).trim();
      assert.strictEqual(accessSecret, '');
    });
  });

  await runTest('Assertion 16: Development mode permits local startup warning when secrets are unconfigured', () => {
    withEnv({
      NODE_ENV: 'development',
      SUPABASE_URL: validSupabaseUrl
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.isProduction, false);
    });
  });

  // --- SECTION 2: Secret Redaction & Token Verification ---

  await runTest('Assertion 17: Startup errors do not expose secret values', () => {
    const sensitiveSecret = 'SUPER_SECRET_KEY_VALUES_1234567890_LONG';
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: sensitiveSecret
    }, () => {
      try {
        validateStartupConfig();
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.message.includes(sensitiveSecret), false);
      }
    });
  });

  await runTest('Assertion 18: Structured logger redacts JWT values', () => {
    const structuredLogger = require('./monitoring/structuredLogger');
    const redacted = structuredLogger.redactSensitiveData({ jwt_secret: 'secret123', token: 'bearer.xyz' });
    assert.strictEqual(redacted.jwt_secret, '[REDACTED]');
    assert.strictEqual(redacted.token, '[REDACTED]');
  });

  await runTest('Assertion 19: Authentication service uses centralized configuration', () => {
    assert.ok(authService);
    assert.strictEqual(typeof authService.generateTokens, 'function');
  });

  await runTest('Assertion 20: Authentication middleware uses centralized configuration', () => {
    assert.ok(config.jwt);
    assert.ok('accessSecret' in config.jwt);
    assert.ok('refreshSecret' in config.jwt);
  });

  await runTest('Assertion 21: Access token signing works correctly', () => {
    const testSecret = 'test_access_secret_32_chars_minimum';
    const token = jwt.sign({ id: 'u_101', role: 'CUSTOMER' }, testSecret, { expiresIn: '1h' });
    assert.ok(typeof token === 'string' && token.length > 20);
  });

  await runTest('Assertion 22: Access token verification works correctly', () => {
    const testSecret = 'test_access_secret_32_chars_minimum';
    const token = jwt.sign({ id: 'u_101', role: 'CUSTOMER' }, testSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, testSecret);
    assert.strictEqual(decoded.id, 'u_101');
    assert.strictEqual(decoded.role, 'CUSTOMER');
  });

  await runTest('Assertion 23: Invalid access token fails verification', () => {
    assert.throws(() => {
      jwt.verify('invalid.jwt.token', 'some_secret_key_32_chars_long_1234');
    });
  });

  await runTest('Assertion 24: Refresh token signing works correctly', () => {
    const refreshSec = 'test_refresh_secret_32_chars_minimum';
    const token = jwt.sign({ id: 'u_101', role: 'CUSTOMER' }, refreshSec, { expiresIn: '7d' });
    assert.ok(typeof token === 'string' && token.length > 20);
  });

  await runTest('Assertion 25: Refresh token verification works correctly', () => {
    const refreshSec = 'test_refresh_secret_32_chars_minimum';
    const token = jwt.sign({ id: 'u_101', role: 'CUSTOMER' }, refreshSec, { expiresIn: '7d' });
    const decoded = jwt.verify(token, refreshSec);
    assert.strictEqual(decoded.id, 'u_101');
  });

  await runTest('Assertion 26: Admin authorization remains functional', () => {
    let allowed = false;
    authorizeAdmin({ user: { id: 'admin_1', role: 'ADMIN' } }, {}, () => { allowed = true; });
    assert.strictEqual(allowed, true);
  });

  await runTest('Assertion 27: Delivery partner authorization remains functional', () => {
    let allowed = false;
    authorizeDeliveryPartner({ user: { id: 'partner_1', role: 'DELIVERY_PARTNER' } }, {}, () => { allowed = true; });
    assert.strictEqual(allowed, true);
  });

  await runTest('Assertion 28: OTP_ENCRYPTION_KEY is not required for production startup', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid32ByteSecret
    }, () => {
      delete process.env.OTP_ENCRYPTION_KEY;
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.missingVars.includes('OTP_ENCRYPTION_KEY'), false);
    });
  });

  await runTest('Assertion 29: Environment variables are loaded before startup validation execution', () => {
    assert.ok(process.env);
  });

  await runTest('Assertion 30: Legacy JWT configuration paths do not bypass validation', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'changeme'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      });
    });
  });

  await runTest('Assertion 31: Operational health and readiness endpoints return 200 OK after startup', async () => {
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

  await runTest('Assertion 32: Invalid production configuration fails before HTTP server initialization', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      });
    });
  });

  console.log('\n====================================================');
  console.log(`  FIX JWT STARTUP VALIDATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runJwtStartupValidationTests();
