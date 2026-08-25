const MemoryRateLimitStore = require('./memoryRateLimitStore');
const RedisRateLimitStore = require('./redisRateLimitStore');
const logger = require('../../utils/logger');

let instance = null;

function getRateLimitStore() {
  if (!instance) {
    const providerType = (process.env.RATE_LIMIT_PROVIDER || 'memory').toLowerCase();
    if (providerType === 'redis') {
      instance = new RedisRateLimitStore();
    } else {
      instance = new MemoryRateLimitStore();
    }
    logger.info(`[RATELIMIT_STORE_INIT] Initialized '${instance.name}' rate limit store.`);
  }
  return instance;
}

function resetRateLimitStoreForTests() {
  instance = null;
}

module.exports = {
  getRateLimitStore,
  resetRateLimitStoreForTests
};
