const logger = require('../utils/logger');
const { redactSensitiveData } = require('../utils/redactSensitiveData');
const envConfig = require('../config/env');

const createStructuredLog = ({
  level = 'info',
  message = '',
  requestId = null,
  userId = null,
  method = null,
  path = null,
  statusCode = null,
  durationMs = null,
  error = null,
  metadata = {}
}) => {
  const sanitizedMeta = redactSensitiveData(metadata || {});
  const sanitizedError = error ? redactSensitiveData(error) : null;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    environment: envConfig.env,
    message: redactSensitiveData(message),
    requestId: requestId || null,
    userId: userId || null,
    method: method || null,
    path: path || null,
    statusCode: statusCode || null,
    durationMs: durationMs || null,
    ...(sanitizedError ? { error: sanitizedError } : {}),
    ...(Object.keys(sanitizedMeta).length > 0 ? { metadata: sanitizedMeta } : {})
  };

  return payload;
};

const logStructuredRequest = (req, res, durationMs) => {
  const payload = createStructuredLog({
    level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    message: `HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`,
    requestId: req.id || req.requestId,
    userId: req.user?.id || null,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode: res.statusCode,
    durationMs
  });

  if (res.statusCode >= 500) {
    logger.error(JSON.stringify(payload));
  } else if (res.statusCode >= 400) {
    logger.warn(JSON.stringify(payload));
  } else {
    logger.info(JSON.stringify(payload));
  }
};

const logStructuredError = (err, req = null, metadata = {}) => {
  const payload = createStructuredLog({
    level: 'error',
    message: err?.message || 'Application Error',
    requestId: req?.id || req?.requestId || null,
    userId: req?.user?.id || null,
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    statusCode: err?.statusCode || err?.status || 500,
    error: err,
    metadata
  });

  logger.error(JSON.stringify(payload));
};

module.exports = {
  createStructuredLog,
  logStructuredRequest,
  logStructuredError,
  logger
};
