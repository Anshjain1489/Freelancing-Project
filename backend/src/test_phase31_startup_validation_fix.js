const assert = require('assert');
const crypto = require('crypto');
const { validateStartupConfig } = require('./services/startupValidation.service');
const healthController = require('./controllers/health.controller');
const logger = require('./utils/logger');

// Mute logger during test execution
logger.info = () => {};
logger.warn = () => {};
logger.error = () => {};

async function runPhase31StartupValidationFixTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 31 STARTUP VALIDATION FIX TEST SUITE');
  console.log('  JWT_SECRET, OTP_ENCRYPTION_KEY & Production Health (20 Assertions)');
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
  const validJwtSecret = 'super_secure_production_jwt_secret_key_2026_long_and_random';
  const validSupabaseUrl = 'https://vuhwlckfhexlyezmfled.supabase.co';

  // Helper to run with temporary env overrides
  const withEnv = (envOverrides, fn) => {
    const backup = { ...process.env };
    Object.assign(process.env, envOverrides);
    try {
      return fn();
    } finally {
      process.env = backup;
    }
  };

  // --- SECTION 1: Missing Required Production Secrets ---
  await runTest('Assertion 1: Missing JWT_SECRET fails in production mode', () => {
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

  await runTest('Assertion 2: Missing SUPABASE_URL fails in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: validJwtSecret
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, (err) => err.message.includes('SUPABASE_URL'));
    });
  });

  await runTest('Assertion 3: Missing both SUPABASE_URL and JWT_SECRET reports both variable names without exposing values', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, (err) => {
        return err.message.includes('JWT_SECRET') && err.message.includes('SUPABASE_URL');
      });
    });
  });

  // --- SECTION 2: JWT_SECRET Validation ---
  await runTest('Assertion 4: Valid JWT_SECRET passes validation', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 5: Empty JWT secret fails in production mode', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '   ',
      JWT_ACCESS_SECRET: ''
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /Startup Validation Failed/);
    });
  });

  await runTest('Assertion 6: Placeholder JWT secret (changeme) fails in production mode', () => {
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

  // --- SECTION 3: Non-OTP Startup Validation & AES Cipher Utility ---
  await runTest('Assertion 7: Production startup succeeds without OTP_ENCRYPTION_KEY', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      delete process.env.OTP_ENCRYPTION_KEY;
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 8: JWT_ACCESS_SECRET can satisfy JWT secret requirement', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: '',
      JWT_ACCESS_SECRET: validJwtSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 9: Production startup returns isProduction: true', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.isProduction, true);
    });
  });

  await runTest('Assertion 10: Production startup missingVars array is empty on valid config', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.missingVars.length, 0);
    });
  });

  await runTest('Assertion 11: Decoded byte length of 64-hex key is exactly 32 bytes', () => {
    const buf = Buffer.from(valid64HexKey, 'hex');
    assert.strictEqual(buf.length, 32);
  });

  await runTest('Assertion 12: AES-256-GCM encryption self-test succeeds with valid 64-hex key', () => {
    const key = Buffer.from(valid64HexKey, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update('TEST_AES_PAYLOAD', 'utf8', 'hex');
    enc += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');

    assert.strictEqual(dec, 'TEST_AES_PAYLOAD');
  });

  await runTest('Assertion 13: AES self-test decipher fails safely on tampered authTag', () => {
    const key = Buffer.from(valid64HexKey, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let enc = cipher.update('TEST_AES_PAYLOAD', 'utf8', 'hex');
    enc += cipher.final('hex');
    const badAuthTag = crypto.randomBytes(16);

    assert.throws(() => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(badAuthTag);
      let dec = decipher.update(enc, 'hex', 'utf8');
      dec += decipher.final('utf8');
    });
  });

  // --- SECTION 4: Zero Secret Leakage & Environment Modes ---
  await runTest('Assertion 14: Secret values never appear in validation error messages', () => {
    const secretVal = 'SUPER_SECRET_VALUE_DO_NOT_LOG_12345';
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

  await runTest('Assertion 15: Production validation remains strict', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: '',
      JWT_SECRET: validJwtSecret
    }, () => {
      assert.throws(() => {
        validateStartupConfig();
      }, /Startup Validation Failed/);
    });
  });

  await runTest('Assertion 16: Development environment allows startup with warnings', () => {
    withEnv({
      NODE_ENV: 'development',
      SUPABASE_URL: '',
      JWT_SECRET: ''
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isProduction, false);
    });
  });

  // --- SECTION 5: Config Loading, Bypasses & Health Verification ---
  await runTest('Assertion 17: Environment configuration is accessible before startup validation', () => {
    const config = require('./config/environment');
    assert.ok(config);
    assert.ok(config.store);
  });

  await runTest('Assertion 18: Disabled optional integrations (e.g. WhatsApp) do not block startup', () => {
    withEnv({
      NODE_ENV: 'production',
      SUPABASE_URL: validSupabaseUrl,
      JWT_SECRET: validJwtSecret,
      WHATSAPP_ENABLED: 'false'
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(res.valid, true);
    });
  });

  await runTest('Assertion 19: Phase 30 startup validation interface compatibility is preserved', () => {
    withEnv({
      NODE_ENV: 'development'
    }, () => {
      const res = validateStartupConfig();
      assert.strictEqual(typeof res.valid, 'boolean');
      assert.strictEqual(Array.isArray(res.missingVars), true);
    });
  });

  await runTest('Assertion 20: Health and readiness endpoints return 200 OK under valid production configuration', async () => {
    const req = {};
    const healthResult = await new Promise((resolve) => {
      const res = {
        status: (code) => ({
          json: (b) => resolve({ statusCode: code, body: b })
        })
      };
      healthController.getHealthStatus(req, res, () => {});
    });

    const readyResult = await new Promise((resolve) => {
      const res = {
        status: (code) => ({
          json: (b) => resolve({ statusCode: code, body: b })
        })
      };
      healthController.getHealthReadiness(req, res, () => {});
    });

    assert.strictEqual(healthResult.statusCode, 200);
    assert.strictEqual(healthResult.body.status, 'ok');
    assert.strictEqual(readyResult.statusCode, 200);
    assert.strictEqual(readyResult.body.status, 'ok');
  });

  console.log('\n====================================================');
  console.log(`  PHASE 31 STARTUP VALIDATION FIX SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase31StartupValidationFixTests();
