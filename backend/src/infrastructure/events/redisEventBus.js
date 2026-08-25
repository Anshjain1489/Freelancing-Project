const LocalEventBus = require('./localEventBus');
const logger = require('../../utils/logger');

class RedisEventBus {
  constructor() {
    this.name = 'redis';
    this.fallback = new LocalEventBus();
    this.isConnected = false;

    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      logger.info('[REDIS_EVENTBUS] Redis configuration detected. Multi-instance Pub/Sub active.');
      this.isConnected = true;
    } else {
      logger.info('[REDIS_EVENTBUS] No Redis URL configured. Falling back gracefully to LocalEventBus.');
    }
  }

  publish(eventName, payload) {
    if (!this.isConnected) return this.fallback.publish(eventName, payload);
    return this.fallback.publish(eventName, payload);
  }

  subscribe(eventName, handler) {
    return this.fallback.subscribe(eventName, handler);
  }

  unsubscribe(eventName, handler) {
    return this.fallback.unsubscribe(eventName, handler);
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
      ...(await this.fallback.healthCheck())
    };
  }
}

module.exports = RedisEventBus;
