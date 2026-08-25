const logger = require('../utils/logger');
const performanceMetrics = require('../services/performanceMetrics.service');

/**
 * Performance monitoring middleware
 * Measures complete HTTP request lifecycle duration, appends X-Response-Time header,
 * logs slow queries (>500ms / >1000ms / >3000ms), and records rolling metrics.
 */
const performanceMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime.bigint();

  // Hook into response finish event
  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1e6;
    const roundedDurationMs = parseFloat(durationMs.toFixed(2));

    // Append X-Response-Time header if headers not yet sent (handled via res.setHeader on writeHead)
    performanceMetrics.recordRequest(roundedDurationMs);

    const requestId = req.id || res.getHeader('X-Request-ID') || '-';
    const method = req.method;
    const path = req.originalUrl || req.url;
    const statusCode = res.statusCode;

    const logDetails = {
      requestId,
      method,
      path,
      statusCode,
      durationMs: roundedDurationMs,
      timestamp: new Date().toISOString()
    };

    if (roundedDurationMs > 3000) {
      logger.error(`[PERF_CRITICAL] ${method} ${path} - ${statusCode} took ${roundedDurationMs}ms`, logDetails);
    } else if (roundedDurationMs > 1000) {
      logger.warn(`[PERF_SLOW] ${method} ${path} - ${statusCode} took ${roundedDurationMs}ms`, logDetails);
    } else if (roundedDurationMs > 500) {
      logger.info(`[PERF_WARN] ${method} ${path} - ${statusCode} took ${roundedDurationMs}ms`, logDetails);
    }
  });

  // Intercept writeHead to reliably attach X-Response-Time header
  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1e6;
    const roundedDurationMs = parseFloat(durationMs.toFixed(2));

    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${roundedDurationMs}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  next();
};

module.exports = performanceMiddleware;
