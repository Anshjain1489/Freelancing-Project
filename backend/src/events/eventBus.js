const EventEmitter = require('events');
const logger = require('../utils/logger');

class AppEventBus extends EventEmitter {}

const eventBus = new AppEventBus();

// Log unhandled errors in event listeners
eventBus.on('error', (err) => {
  logger.error('[EVENT_BUS_ERROR]', err);
});

module.exports = eventBus;
