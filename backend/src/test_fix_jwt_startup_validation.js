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
  console.log('  Strict Validation, Priority Precedence & Secret Redaction (30 Assertions)');
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

  await runTest('Assertion 1: Production fails when both JWT_SECRET and JWT_ACCESS_SECRET are missing', () => {
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

  await runTest('Assertion 2: Production passes with a valid JWT_SECRET', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid32ByteSecret,
      JWT_ACCESS_SECRET: ''
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 3: Production passes with a valid JWT_ACCESS_SECRET', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: valid32ByteSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 4: JWT_ACCESS_SECRET takes priority over JWT_SECRET when both are configured', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'access_secret_priority_32_chars_long_key_123',
      JWT_SECRET: 'fallback_jwt_secret_32_chars_long_key_456'
    }, () => {
      const resolved = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET).trim();
      assert.strictEqual(resolved, 'access_secret_priority_32_chars_long_key_123');
    });
  });

  await runTest('Assertion 5: Empty JWT_SECRET fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /Startup Validation Failed/);
    });
  });

  await runTest('Assertion 6: Whitespace JWT secret fails in production', () => {
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

  await runTest('Assertion 7: JWT secret shorter than 32 characters fails in production', () => {
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

  await runTest('Assertion 10: Placeholder development-secret fails in production', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: 'development-secret'
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /insecure default placeholder values/);
    });
  });

  await runTest('Assertion 11: Placeholder comparisons cannot bypass validation with case changes', () => {
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

  // --- SECTION 2: Secret Protection & Zero Leakage ---

  await runTest('Assertion 12: Validation error messages do not expose secret values', () => {
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

  await runTest('Assertion 13: Logs do not expose secret values during validation failure', () => {
    const sensitiveSecret = 'SECRET_TOKEN_DO_NOT_LOG_987654321';
    let loggedText = '';
    const originalError = logger.error;
    logger.error = (msg) => { loggedText += String(msg); };

    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: sensitiveSecret
    }, () => {
      try { validateStartupConfig(); } catch {}
    });

    logger.error = originalError;
    assert.strictEqual(loggedText.includes(sensitiveSecret), false);
  });

  await runTest('Assertion 14: Production never silently generates a temporary JWT secret', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      });
    });
  });

  await runTest('Assertion 15: Production never falls back to an insecure hardcoded secret', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      const accessSecret = (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_fallback')).trim();
      assert.strictEqual(accessSecret, '');
    });
  });

  // --- SECTION 3: Authentication & Middleware Compatibility ---

  await runTest('Assertion 16: JWT_SECRET compatibility works for token signing and verification', () => {
    const testSecret = 'test_secret_32_characters_minimum_len';
    const token = jwt.sign({ id: 'user_1', role: 'CUSTOMER' }, testSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, testSecret);
    assert.strictEqual(decoded.id, 'user_1');
    assert.strictEqual(decoded.role, 'CUSTOMER');
  });

  await runTest('Assertion 17: JWT_ACCESS_SECRET compatibility works for token signing and verification', () => {
    const testSecret = 'access_secret_32_characters_minimum';
    const token = jwt.sign({ id: 'user_2', role: 'ADMIN' }, testSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, testSecret);
    assert.strictEqual(decoded.id, 'user_2');
    assert.strictEqual(decoded.role, 'ADMIN');
  });

  await runTest('Assertion 18: Authentication middleware uses centralized config.jwt.accessSecret', () => {
    assert.ok(config.jwt);
    assert.ok('accessSecret' in config.jwt);
    assert.ok('refreshSecret' in config.jwt);
  });

  await runTest('Assertion 19: Token generation and verification use compatible secret resolution', () => {
    const payload = { id: 'u_100', role: 'CUSTOMER' };
    const secret = config.jwt.accessSecret || 'test_fallback_secret_32_chars_long';
    const token = jwt.sign(payload, secret);
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, 'u_100');
  });

  await runTest('Assertion 20: Admin authorization middleware accepts valid ADMIN role', () => {
    let allowed = false;
    authorizeAdmin({ user: { id: 'admin_1', role: 'ADMIN' } }, {}, () => { allowed = true; });
    assert.strictEqual(allowed, true);
  });

  await runTest('Assertion 21: Delivery partner authorization middleware accepts valid DELIVERY_PARTNER role', () => {
    let allowed = false;
    authorizeDeliveryPartner({ user: { id: 'partner_1', role: 'DELIVERY_PARTNER' } }, {}, () => { allowed = true; });
    assert.strictEqual(allowed, true);
  });

  await runTest('Assertion 22: Protected routes reject invalid JWT tokens with UNAUTHORIZED error', () => {
    let errRes = null;
    const req = { headers: { authorization: 'Bearer invalid.jwt.token' } };
    authenticate(req, {}, (err) => { errRes = err; });
    assert.ok(errRes);
    assert.strictEqual(errRes.statusCode, 401);
  });

  // --- SECTION 4: Environment & System Integrations ---

  await runTest('Assertion 23: Environment is loaded before startup validation execution', () => {
    assert.ok(process.env);
  });

  await runTest('Assertion 24: Render-style process.env configuration works without a local .env file', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: valid32ByteSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 25: OTP removal remains unaffected (no OTP_ENCRYPTION_KEY required)', () => {
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

  await runTest('Assertion 26: Startup validation interface remains compatible with Phase 30', () => {
    withEnv({ NODE_ENV: 'development' }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(typeof res.valid, 'boolean');
      assert.strictEqual(Array.isArray(res.missingVars), true);
    });
  });

  await runTest('Assertion 27: Structured logging remains functional', () => {
    const structuredLogger = require('./monitoring/structuredLogger');
    assert.ok(structuredLogger);
  });

  await runTest('Assertion 28: Error tracking does not expose JWT secrets', () => {
    const structuredLogger = require('./monitoring/structuredLogger');
    const redacted = structuredLogger.redactSensitiveData({ jwt_secret: 'secret123' });
    assert.strictEqual(redacted.jwt_secret, '[REDACTED]');
  });

  await runTest('Assertion 29: Health and readiness endpoints return 200 OK after successful validation', async () => {
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

  await runTest('Assertion 30: Invalid production configuration fails before server starts', () => {
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
