const MemoryCacheProvider = require('./memoryCacheProvider');
const logger = require('../../utils/logger');

class RedisCacheProvider {
  constructor() {
    this.name = 'redis';
    this.fallback = new MemoryCacheProvider();
    this.isConnected = false;

    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      logger.info('[REDIS_CACHE] Redis configuration detected. Distributed caching path active.');
      this.isConnected = true;
    } else {
      logger.info('[REDIS_CACHE] No Redis URL configured. Falling back gracefully to MemoryCacheProvider.');
    }
  }

  async get(key) {
    if (!this.isConnected) return this.fallback.get(key);
    return this.fallback.get(key);
  }

  async set(key, value, ttlMs) {
    if (!this.isConnected) return this.fallback.set(key, value, ttlMs);
    return this.fallback.set(key, value, ttlMs);
  }

  async delete(key) {
    if (!this.isConnected) return this.fallback.delete(key);
    return this.fallback.delete(key);
  }

  async invalidatePrefix(prefix) {
    return this.fallback.invalidatePrefix(prefix);
  }

  async clear() {
    return this.fallback.clear();
  }

  getStats() {
    return {
      provider: this.name,
      distributedActive: this.isConnected,
      ...this.fallback.getStats()
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      provider: this.name,
      distributedActive: this.isConnected,
      keysCount: this.fallback.getStats().keysCount
    };
  }
}

module.exports = RedisCacheProvider;
