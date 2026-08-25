const logger = require('../utils/logger');

// In-memory cache storage: Map<key, { value, expiresAt, ttlMs }>
const cacheStore = new Map();

let hits = 0;
let misses = 0;
let evictions = 0;

const DEFAULT_TTL_MS = 300000; // 5 Minutes Default TTL

/**
 * Get cached item if present and not expired
 */
const get = (key) => {
  if (!key || typeof key !== 'string') return null;

  const entry = cacheStore.get(key);
  if (!entry) {
    misses++;
    return null;
  }

  const now = Date.now();
  if (entry.expiresAt && now > entry.expiresAt) {
    cacheStore.delete(key);
    evictions++;
    misses++;
    return null;
  }

  hits++;
  return entry.value;
};

/**
 * Set cache key with optional TTL in milliseconds
 */
const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  if (!key || typeof key !== 'string') return false;

  try {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    cacheStore.set(key, {
      value,
      expiresAt,
      ttlMs
    });
    return true;
  } catch (err) {
    logger.error(`[CACHE_SET_ERR] Failed to set key=${key}`, err);
    return false;
  }
};

/**
 * Delete specific key
 */
const del = (key) => {
  if (!key) return false;
  return cacheStore.delete(key);
};

/**
 * Invalidate all keys matching prefix (e.g. 'products:', 'categories:')
 */
const invalidatePrefix = (prefix) => {
  if (!prefix || typeof prefix !== 'string') return 0;
  let count = 0;
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
      count++;
    }
  }
  logger.info(`[CACHE_INVALIDATE] Invalidated ${count} keys for prefix '${prefix}'`);
  return count;
};

/**
 * Helper to invalidate all product-related caches
 */
const invalidateProductCache = () => {
  return invalidatePrefix('products:');
};

/**
 * Helper to invalidate all category-related caches
 */
const invalidateCategoryCache = () => {
  invalidatePrefix('categories:');
  return invalidatePrefix('products:');
};

/**
 * Clear entire cache
 */
const clear = () => {
  const size = cacheStore.size;
  cacheStore.clear();
  return size;
};

/**
 * Reset stats for testing
 */
const resetStatsForTests = () => {
  hits = 0;
  misses = 0;
  evictions = 0;
  cacheStore.clear();
};

/**
 * Get cache performance statistics
 */
const getStats = () => {
  const total = hits + misses;
  const hitRatio = total > 0 ? parseFloat((hits / total).toFixed(4)) : 0;
  return {
    hits,
    misses,
    hitRatio,
    keysCount: cacheStore.size,
    evictions
  };
};

// Periodic cleanup timer for expired keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt && now > entry.expiresAt) {
      cacheStore.delete(key);
      evictions++;
    }
  }
}, 60000);

module.exports = {
  get,
  set,
  delete: del,
  invalidatePrefix,
  invalidateProductCache,
  invalidateCategoryCache,
  clear,
  resetStatsForTests,
  getStats
};
