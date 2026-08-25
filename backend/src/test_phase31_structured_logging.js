const assert = require('assert');
const structuredLogger = require('./monitoring/structuredLogger');
const { redactSensitiveData } = require('./monitoring/structuredLogger');

async function runPhase31StructuredLoggingTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 31 AUTOMATED STRUCTURED LOGGING SUITE');
  console.log('  JSON Formatting, Context Propagation & Sensitive Redaction (20 Assertions)');
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

  await runTest('Assertion 1: formatLog generates valid JSON string', () => {
    const jsonStr = structuredLogger.formatLog('INFO', 'Test log message', { requestId: 'req-1' });
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.message, 'Test log message');
    assert.strictEqual(parsed.level, 'INFO');
    assert.strictEqual(parsed.requestId, 'req-1');
    assert.ok(parsed.timestamp);
  });

  await runTest('Assertion 2: Logger supports DEBUG level', () => {
    const log = structuredLogger.formatLog('DEBUG', 'Debug info', { component: 'cache' });
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.level, 'DEBUG');
    assert.strictEqual(parsed.component, 'cache');
  });

  await runTest('Assertion 3: Logger supports INFO level', () => {
    const log = structuredLogger.formatLog('INFO', 'Info message');
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.level, 'INFO');
  });

  await runTest('Assertion 4: Logger supports WARN level', () => {
    const log = structuredLogger.formatLog('WARN', 'Warning message');
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.level, 'WARN');
  });

  await runTest('Assertion 5: Logger supports ERROR level', () => {
    const log = structuredLogger.formatLog('ERROR', 'Error message');
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.level, 'ERROR');
  });

  await runTest('Assertion 6: Logger supports FATAL level', () => {
    const log = structuredLogger.formatLog('FATAL', 'Fatal system crash');
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.level, 'FATAL');
  });

  await runTest('Assertion 7: Contextual field propagation includes method, path, statusCode, durationMs', () => {
    const log = structuredLogger.formatLog('INFO', 'HTTP Request', {
      method: 'POST',
      path: '/api/v1/orders',
      statusCode: 201,
      durationMs: 45.2
    });
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.method, 'POST');
    assert.strictEqual(parsed.path, '/api/v1/orders');
    assert.strictEqual(parsed.statusCode, 201);
    assert.strictEqual(parsed.durationMs, 45.2);
  });

  await runTest('Assertion 8: Sensitive key password is redacted', () => {
    const input = { user: 'admin', password: 'SuperSecretPassword123' };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.password, '[REDACTED]');
    assert.strictEqual(redacted.user, 'admin');
  });

  await runTest('Assertion 9: Sensitive key token and authorization headers are redacted', () => {
    const input = { authorization: 'Bearer secret.jwt.token', token: 'raw_token_val' };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.authorization, '[REDACTED]');
    assert.strictEqual(redacted.token, '[REDACTED]');
  });

  await runTest('Assertion 10: Sensitive keys otp and delivery_otp_hash are redacted', () => {
    const input = { otp: '654321', delivery_otp_hash: 'abcdef123456789' };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.otp, '[REDACTED]');
    assert.strictEqual(redacted.delivery_otp_hash, '[REDACTED]');
  });

  await runTest('Assertion 11: Sensitive payment secrets razorpaySecret and cvv are redacted', () => {
    const input = { razorpaySecret: 'rzp_sec_999', cvv: '123', safeField: 'Public' };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.razorpaySecret, '[REDACTED]');
    assert.strictEqual(redacted.cvv, '[REDACTED]');
    assert.strictEqual(redacted.safeField, 'Public');
  });

  await runTest('Assertion 12: Nested sensitive objects are redacted recursively', () => {
    const input = {
      meta: {
        auth: {
          jwt_secret: 'topsecretkey',
          user: 'john'
        }
      }
    };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.meta.auth.jwt_secret, '[REDACTED]');
    assert.strictEqual(redacted.meta.auth.user, 'john');
  });

  await runTest('Assertion 13: Redaction does not mutate original application object', () => {
    const original = { password: 'MyPassword123', count: 10 };
    const redacted = redactSensitiveData(original);
    assert.strictEqual(original.password, 'MyPassword123'); // Original untouched
    assert.strictEqual(redacted.password, '[REDACTED]');
  });

  await runTest('Assertion 14: Circular object references are handled safely', () => {
    const parent = { name: 'parent' };
    parent.child = parent; // Circular
    const redacted = redactSensitiveData(parent);
    assert.strictEqual(redacted.name, 'parent');
    assert.strictEqual(redacted.child, '[CIRCULAR]');
  });

  await runTest('Assertion 15: Error instance passed to logger is formatted cleanly', () => {
    const err = new Error('Database Connection Failed');
    const log = structuredLogger.formatLog('ERROR', 'Failure', { error: err });
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.error.message, 'Database Connection Failed');
    assert.ok(parsed.error.stack);
  });

  await runTest('Assertion 16: Buffer fields are represented safely', () => {
    const input = { payload: Buffer.from('hello world') };
    const redacted = redactSensitiveData(input);
    assert.strictEqual(redacted.payload, '[BUFFER]');
  });

  await runTest('Assertion 17: Null and undefined input parameters return cleanly', () => {
    assert.strictEqual(redactSensitiveData(null), null);
    assert.strictEqual(redactSensitiveData(undefined), undefined);
  });

  await runTest('Assertion 18: Array of sensitive items redacts each item recursively', () => {
    const list = [
      { id: 1, password: 'p1' },
      { id: 2, password: 'p2' }
    ];
    const redacted = redactSensitiveData(list);
    assert.strictEqual(redacted[0].password, '[REDACTED]');
    assert.strictEqual(redacted[1].password, '[REDACTED]');
  });

  await runTest('Assertion 19: Helper method structuredLogger.redact matches redactSensitiveData', () => {
    const res = structuredLogger.redact({ token: 'abc' });
    assert.strictEqual(res.token, '[REDACTED]');
  });

  await runTest('Assertion 20: Missing optional context does not throw error', () => {
    const log = structuredLogger.formatLog('INFO', 'Standalone Log');
    const parsed = JSON.parse(log);
    assert.strictEqual(parsed.message, 'Standalone Log');
  });

  console.log('\n====================================================');
  console.log(`  PHASE 31 STRUCTURED LOGGING SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase31StructuredLoggingTests();
