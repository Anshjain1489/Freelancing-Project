const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`,
    code: ERROR_CODES.NOT_FOUND
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ZodError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.UNAUTHORIZED;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.UNAUTHORIZED;
    message = 'Authentication token expired';
  }

  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message: message,
    code: code
  });
};

module.exports = { notFound, errorHandler };
