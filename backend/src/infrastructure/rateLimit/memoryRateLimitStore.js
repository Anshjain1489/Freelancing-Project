const hitsMap = new Map();

class MemoryRateLimitStore {
  constructor() {
    this.name = 'memory';
  }

  async increment(key, windowMs = 60000) {
    if (!key) return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };

    const now = Date.now();
    let record = hitsMap.get(key);

    if (!record || now > record.resetTime) {
      record = {
        hits: 1,
        resetTime: now + windowMs
      };
    } else {
      record.hits += 1;
    }

    hitsMap.set(key, record);

    return {
      totalHits: record.hits,
      resetTime: new Date(record.resetTime)
    };
  }

  async get(key) {
    const record = hitsMap.get(key);
    if (!record || Date.now() > record.resetTime) return null;
    return {
      totalHits: record.hits,
      resetTime: new Date(record.resetTime)
    };
  }

  async reset(key) {
    if (key) return hitsMap.delete(key);
    hitsMap.clear();
    return true;
  }

  async healthCheck() {
    return {
      status: 'healthy',
      provider: this.name,
      activeKeysCount: hitsMap.size
    };
  }
}

module.exports = MemoryRateLimitStore;
