const LocalEventBus = require('./localEventBus');
const RedisEventBus = require('./redisEventBus');
const logger = require('../../utils/logger');

let instance = null;

function getEventBus() {
  if (!instance) {
    const providerType = (process.env.EVENT_BUS_PROVIDER || 'local').toLowerCase();
    if (providerType === 'redis') {
      instance = new RedisEventBus();
    } else {
      instance = new LocalEventBus();
    }
    logger.info(`[EVENTBUS_INIT] Initialized '${instance.name}' event bus provider.`);
  }
  return instance;
}

function resetEventBusForTests() {
  instance = null;
}

module.exports = {
  getEventBus,
  resetEventBusForTests
};
