const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const logger = require('../utils/logger');
const { redactSensitiveData, sanitizeString } = require('../utils/redactSensitiveData');
const config = require('../config/env');

const notFound = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`,
    code: ERROR_CODES.NOT_FOUND,
    requestId: req.id || req.requestId || null
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = err.errorCode || err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let rawMessage = err.message || 'Internal Server Error';

  if (err.name === 'ZodError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    rawMessage = err.errors ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') : 'Validation failed';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.UNAUTHORIZED;
    rawMessage = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.UNAUTHORIZED;
    rawMessage = 'Authentication token expired';
  }

  // Redact any sensitive information from error messages
  let safeMessage = sanitizeString(rawMessage);

  // Mask internal 500 database/system exceptions unless running in development
  const currentEnv = process.env.NODE_ENV || config.env || 'development';
  if (currentEnv !== 'development' && statusCode >= 500) {
    safeMessage = 'An unexpected server error occurred. Please try again later.';
  }

  const reqId = req.id || req.requestId || null;

  if (statusCode >= 500) {
    logger.error(`[ERROR 500] ${req.method} ${req.originalUrl} - ${safeMessage}`, redactSensitiveData(err));
  } else {
    logger.warn(`[WARN ${statusCode}] ${req.method} ${req.originalUrl} - ${safeMessage}`);
  }

  const responsePayload = {
    success: false,
    message: safeMessage,
    code: code,
    error: {
      code: code,
      message: safeMessage
    },
    requestId: reqId
  };

  // Only include debug details in development if explicitly configured
  if (currentEnv === 'development' && err.stack) {
    responsePayload.debug = {
      stack: sanitizeString(err.stack)
    };
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = { notFound, errorHandler };
