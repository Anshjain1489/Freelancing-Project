const { redactSensitiveData } = require('../utils/redactSensitiveData');
const loggerService = require('./logger.service');
const config = require('../config/environment');

let userContext = null;
let requestContext = null;

const monitoringService = {
  setUserContext: (user) => {
    if (!user) {
      userContext = null;
      return;
    }
    userContext = redactSensitiveData({
      id: user.id,
      role: user.role,
      email: user.email ? '[REDACTED_EMAIL]' : undefined
    });
  },

  setRequestContext: (req) => {
    if (!req) {
      requestContext = null;
      return;
    }
    requestContext = redactSensitiveData({
      requestId: req.requestId || req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip
    });
  },

  captureException: (error, extra = {}) => {
    const sanitizedExtra = redactSensitiveData(extra);
    const sanitizedError = redactSensitiveData(error);

    loggerService.error(`[MONITORING_EXCEPTION] ${sanitizedError.message || error}`, {
      stack: sanitizedError.stack,
      user: userContext,
      request: requestContext,
      extra: sanitizedExtra,
      sentryEnabled: Boolean(config.monitoring?.sentryDsn)
    });

    return {
      captured: true,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
  },

  captureMessage: (message, level = 'info', extra = {}) => {
    const sanitizedExtra = redactSensitiveData(extra);
    const sanitizedMessage = redactSensitiveData(message);

    loggerService.info(`[MONITORING_MESSAGE] ${sanitizedMessage}`, {
      level,
      user: userContext,
      request: requestContext,
      extra: sanitizedExtra
    });

    return {
      captured: true
    };
  }
};

module.exports = monitoringService;
