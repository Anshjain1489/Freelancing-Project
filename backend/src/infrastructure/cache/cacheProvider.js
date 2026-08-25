const MemoryCacheProvider = require('./memoryCacheProvider');
const RedisCacheProvider = require('./redisCacheProvider');
const logger = require('../../utils/logger');

let instance = null;

function getCacheProvider() {
  if (!instance) {
    const providerType = (process.env.CACHE_PROVIDER || 'memory').toLowerCase();
    if (providerType === 'redis') {
      instance = new RedisCacheProvider();
    } else {
      instance = new MemoryCacheProvider();
    }
    logger.info(`[CACHE_PROVIDER_INIT] Initialized '${instance.name}' cache provider.`);
  }
  return instance;
}

function resetCacheProviderForTests() {
  instance = null;
}

module.exports = {
  getCacheProvider,
  resetCacheProviderForTests
};
