const { redactSensitiveData } = require('../utils/redactSensitiveData');
const config = require('../config/environment');

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50
};

const currentLevelName = (config.monitoring?.logLevel || 'info').toUpperCase();
const currentLevelValue = LOG_LEVELS[currentLevelName] || LOG_LEVELS.INFO;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = redactSensitiveData(meta);

  return {
    timestamp,
    level,
    environment: config.env,
    service: 'chaudhary-kirana-api',
    message: typeof message === 'string' ? redactSensitiveData(message) : message,
    requestId: sanitizedMeta.requestId || sanitizedMeta.reqId || undefined,
    userId: sanitizedMeta.userId || undefined,
    storeId: sanitizedMeta.storeId || undefined,
    durationMs: sanitizedMeta.durationMs || undefined,
    meta: Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : undefined
  };
}

const loggerService = {
  debug: (message, meta) => {
    if (LOG_LEVELS.DEBUG >= currentLevelValue) {
      console.log(JSON.stringify(formatLog('DEBUG', message, meta)));
    }
  },
  info: (message, meta) => {
    if (LOG_LEVELS.INFO >= currentLevelValue) {
      console.log(JSON.stringify(formatLog('INFO', message, meta)));
    }
  },
  warn: (message, meta) => {
    if (LOG_LEVELS.WARN >= currentLevelValue) {
      console.warn(JSON.stringify(formatLog('WARN', message, meta)));
    }
  },
  error: (message, meta) => {
    if (LOG_LEVELS.ERROR >= currentLevelValue) {
      console.error(JSON.stringify(formatLog('ERROR', message, meta)));
    }
  },
  fatal: (message, meta) => {
    if (LOG_LEVELS.FATAL >= currentLevelValue) {
      console.error(JSON.stringify(formatLog('FATAL', message, meta)));
    }
  }
};

module.exports = loggerService;
