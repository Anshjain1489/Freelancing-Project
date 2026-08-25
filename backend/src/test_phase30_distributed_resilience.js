const assert = require('assert');
const { getCacheProvider, resetCacheProviderForTests } = require('./infrastructure/cache/cacheProvider');
const { getRateLimitStore, resetRateLimitStoreForTests } = require('./infrastructure/rateLimit/rateLimitStore');
const { getEventBus, resetEventBusForTests } = require('./infrastructure/events/eventBus');
const logger = require('./utils/logger');

logger.info = () => {};

async function runPhase30DistributedResilienceTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 30 AUTOMATED DISTRIBUTED RESILIENCE SUITE');
  console.log('  Provider Abstractions, Fallback Behavior & Sanitization (20 Assertions)');
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

  // --- SECTION 1: Cache Provider Abstraction ---
  await runTest('Assertion 1: getCacheProvider returns memory provider by default', () => {
    resetCacheProviderForTests();
    delete process.env.CACHE_PROVIDER;
    const provider = getCacheProvider();
    assert.strictEqual(provider.name, 'memory');
  });

  await runTest('Assertion 2: Memory cache provider set and get store and retrieve values', async () => {
    const provider = getCacheProvider();
    await provider.set('resilience:test:1', { foo: 'bar' }, 60000);
    const val = await provider.get('resilience:test:1');
    assert.deepStrictEqual(val, { foo: 'bar' });
  });

  await runTest('Assertion 3: Memory cache provider delete removes key cleanly', async () => {
    const provider = getCacheProvider();
    await provider.delete('resilience:test:1');
    const val = await provider.get('resilience:test:1');
    assert.strictEqual(val, null);
  });

  await runTest('Assertion 4: Memory cache provider invalidatePrefix purges matching keys', async () => {
    const provider = getCacheProvider();
    await provider.set('products:list:1', [1, 2], 60000);
    await provider.set('products:list:2', [3, 4], 60000);
    await provider.set('categories:active', ['grocery'], 60000);

    await provider.invalidatePrefix('products:list');
    assert.strictEqual(await provider.get('products:list:1'), null);
    assert.strictEqual(await provider.get('products:list:2'), null);
    assert.notStrictEqual(await provider.get('categories:active'), null);
  });

  await runTest('Assertion 5: Memory cache provider getStats reports keys count', () => {
    const provider = getCacheProvider();
    const stats = provider.getStats();
    assert.strictEqual(stats.provider, 'memory');
    assert.strictEqual(typeof stats.keysCount, 'number');
  });

  await runTest('Assertion 6: Memory cache provider healthCheck returns status healthy', async () => {
    const provider = getCacheProvider();
    const health = await provider.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.provider, 'memory');
  });

  // --- SECTION 2: Rate Limit Store Abstraction ---
  await runTest('Assertion 7: getRateLimitStore returns memory rate limit store by default', () => {
    resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_PROVIDER;
    const store = getRateLimitStore();
    assert.strictEqual(store.name, 'memory');
  });

  await runTest('Assertion 8: Memory rate limit store increment increments hit count atomically', async () => {
    const store = getRateLimitStore();
    await store.reset('rate:key:1');
    const res1 = await store.increment('rate:key:1', 60000);
    assert.strictEqual(res1.totalHits, 1);
    const res2 = await store.increment('rate:key:1', 60000);
    assert.strictEqual(res2.totalHits, 2);
  });

  await runTest('Assertion 9: Memory rate limit store get returns active hit stats', async () => {
    const store = getRateLimitStore();
    const stats = await store.get('rate:key:1');
    assert.strictEqual(stats.totalHits, 2);
    assert.ok(stats.resetTime instanceof Date);
  });

  await runTest('Assertion 10: Memory rate limit store reset clears specified key', async () => {
    const store = getRateLimitStore();
    await store.reset('rate:key:1');
    const stats = await store.get('rate:key:1');
    assert.strictEqual(stats, null);
  });

  await runTest('Assertion 11: Memory rate limit store healthCheck returns healthy', async () => {
    const store = getRateLimitStore();
    const health = await store.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.provider, 'memory');
  });

  // --- SECTION 3: Event Bus Abstraction ---
  await runTest('Assertion 12: getEventBus returns local event bus by default', () => {
    resetEventBusForTests();
    delete process.env.EVENT_BUS_PROVIDER;
    const bus = getEventBus();
    assert.strictEqual(bus.name, 'local');
  });

  await runTest('Assertion 13: Local event bus publish and subscribe dispatch payload correctly', async () => {
    const bus = getEventBus();
    await new Promise((resolve, reject) => {
      const handler = (payload) => {
        try {
          assert.strictEqual(payload.orderId, 'order-123');
          bus.unsubscribe('TEST_EVENT', handler);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      bus.subscribe('TEST_EVENT', handler);
      bus.publish('TEST_EVENT', { orderId: 'order-123' });
    });
  });

  await runTest('Assertion 14: Local event bus payload sanitization strips passwords, OTPs and secrets', async () => {
    const bus = getEventBus();
    await new Promise((resolve, reject) => {
      const handler = (payload) => {
        try {
          assert.strictEqual(payload.orderId, 'order-999');
          assert.strictEqual(payload.password, undefined);
          assert.strictEqual(payload.otp, undefined);
          assert.strictEqual(payload.delivery_otp_hash, undefined);
          assert.strictEqual(payload.token, undefined);
          bus.unsubscribe('SENSITIVE_EVENT', handler);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      bus.subscribe('SENSITIVE_EVENT', handler);
      bus.publish('SENSITIVE_EVENT', {
        orderId: 'order-999',
        password: 'secret_password_123',
        otp: '123456',
        delivery_otp_hash: 'hash_abc',
        token: 'jwt_xyz'
      });
    });
  });

  await runTest('Assertion 15: Local event bus unsubscribe removes event listener cleanly', () => {
    const bus = getEventBus();
    let count = 0;
    const handler = () => { count++; };
    bus.subscribe('UNSUB_EVENT', handler);
    bus.publish('UNSUB_EVENT', {});
    assert.strictEqual(count, 1);

    bus.unsubscribe('UNSUB_EVENT', handler);
    bus.publish('UNSUB_EVENT', {});
    assert.strictEqual(count, 1);
  });

  await runTest('Assertion 16: Local event bus getStats reports published event count', () => {
    const bus = getEventBus();
    const stats = bus.getStats();
    assert.strictEqual(stats.provider, 'local');
    assert.ok(stats.eventsPublishedCount >= 3);
  });

  await runTest('Assertion 17: Local event bus healthCheck returns status healthy', async () => {
    const bus = getEventBus();
    const health = await bus.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.provider, 'local');
  });

  // --- SECTION 4: Redis Fallback Providers ---
  await runTest('Assertion 18: CACHE_PROVIDER=redis initializes RedisCacheProvider with graceful memory fallback', async () => {
    resetCacheProviderForTests();
    process.env.CACHE_PROVIDER = 'redis';
    const provider = getCacheProvider();
    assert.strictEqual(provider.name, 'redis');
    const health = await provider.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    resetCacheProviderForTests();
    delete process.env.CACHE_PROVIDER;
  });

  await runTest('Assertion 19: RATE_LIMIT_PROVIDER=redis initializes RedisRateLimitStore with graceful memory fallback', async () => {
    resetRateLimitStoreForTests();
    process.env.RATE_LIMIT_PROVIDER = 'redis';
    const store = getRateLimitStore();
    assert.strictEqual(store.name, 'redis');
    const health = await store.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    resetRateLimitStoreForTests();
    delete process.env.RATE_LIMIT_PROVIDER;
  });

  await runTest('Assertion 20: EVENT_BUS_PROVIDER=redis initializes RedisEventBus with graceful local fallback', async () => {
    resetEventBusForTests();
    process.env.EVENT_BUS_PROVIDER = 'redis';
    const bus = getEventBus();
    assert.strictEqual(bus.name, 'redis');
    const health = await bus.healthCheck();
    assert.strictEqual(health.status, 'healthy');
    resetEventBusForTests();
    delete process.env.EVENT_BUS_PROVIDER;
  });

  console.log('\n====================================================');
  console.log(`  PHASE 30 DISTRIBUTED RESILIENCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase30DistributedResilienceTests();
