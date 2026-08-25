const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { redactSensitiveData } = require('../services/securityAudit.service');

const errorMonitoringMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const requestId = req.id || req.headers?.['x-request-id'] || 'unknown_req';

  const serverErrorLog = {
    timestamp: new Date().toISOString(),
    requestId,
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.headers?.['x-forwarded-for'] || 'unknown',
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
    body: redactSensitiveData(req.body)
  };

  try {
    const errorTracker = require('../monitoring/errorTracker.service');
    const structuredLogger = require('../monitoring/structuredLogger');

    errorTracker.captureError(err, serverErrorLog);

    if (statusCode >= 500) {
      console.error(`[ERROR_MONITORING_ALERT] 🚨 HTTP ${statusCode}:`, JSON.stringify(serverErrorLog));
      structuredLogger.error(`HTTP ${statusCode} Server Error: ${err.message}`, serverErrorLog);
    } else {
      structuredLogger.warn(`HTTP ${statusCode} Request Error: ${err.message}`, serverErrorLog);
    }
  } catch (mErr) {
    // Monitoring isolation: failure must never break error response pipeline
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode >= 500 ? 'An unexpected server error occurred.' : err.message,
    code: err.code || (statusCode >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.BAD_REQUEST),
    requestId
  });
};

module.exports = errorMonitoringMiddleware;
