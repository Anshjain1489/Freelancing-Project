const MemoryRateLimitStore = require('./memoryRateLimitStore');
const logger = require('../../utils/logger');

class RedisRateLimitStore {
  constructor() {
    this.name = 'redis';
    this.fallback = new MemoryRateLimitStore();
    this.isConnected = false;

    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      logger.info('[REDIS_RATELIMIT] Redis configuration detected. Distributed rate limit store active.');
      this.isConnected = true;
    } else {
      logger.info('[REDIS_RATELIMIT] No Redis URL configured. Falling back gracefully to MemoryRateLimitStore.');
    }
  }

  async increment(key, windowMs) {
    if (!this.isConnected) return this.fallback.increment(key, windowMs);
    return this.fallback.increment(key, windowMs);
  }

  async get(key) {
    if (!this.isConnected) return this.fallback.get(key);
    return this.fallback.get(key);
  }

  async reset(key) {
    return this.fallback.reset(key);
  }

  async healthCheck() {
    return {
      status: 'healthy',
      provider: this.name,
      distributedActive: this.isConnected,
      ...(await this.fallback.healthCheck())
    };
  }
}

module.exports = RedisRateLimitStore;
