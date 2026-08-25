const cacheService = require('../../services/cache.service');

class MemoryCacheProvider {
  constructor() {
    this.name = 'memory';
  }

  async get(key) {
    return cacheService.get(key);
  }

  async set(key, value, ttlMs) {
    return cacheService.set(key, value, ttlMs);
  }

  async delete(key) {
    return cacheService.delete(key);
  }

  async invalidatePrefix(prefix) {
    return cacheService.invalidatePrefix(prefix);
  }

  async clear() {
    return cacheService.clear();
  }

  getStats() {
    return {
      provider: this.name,
      ...cacheService.getStats()
    };
  }

  async healthCheck() {
    return {
      status: 'healthy',
      provider: this.name,
      keysCount: cacheService.getStats().keysCount
    };
  }
}

module.exports = MemoryCacheProvider;
