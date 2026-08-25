const DEFAULT_MAX_RETRIES = 3;
const BACKOFF_SCHEDULE_MS = [5000, 30000, 120000]; // 5s, 30s, 2m

/**
 * Calculate next run time timestamp in milliseconds based on attempt count
 */
const calculateNextRunAt = (attemptCount) => {
  const idx = Math.min(Math.max(0, attemptCount - 1), BACKOFF_SCHEDULE_MS.length - 1);
  const delayMs = BACKOFF_SCHEDULE_MS[idx] || 120000;
  return new Date(Date.now() + delayMs).toISOString();
};

/**
 * Determine whether a job should be retried or moved to DEAD_LETTER
 */
const shouldRetry = (attemptCount, maxAttempts = DEFAULT_MAX_RETRIES) => {
  return attemptCount < maxAttempts;
};

/**
 * Sanitize job payload/error logs to strip sensitive credentials
 */
const sanitizeJobData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const copy = JSON.parse(JSON.stringify(data));
  const sensitiveKeys = ['password', 'otp', 'rawOtp', 'delivery_otp_hash', 'delivery_otp_encrypted', 'token', 'jwt', 'secret', 'razorpaySecret'];

  const redactObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        redactObject(obj[key]);
      }
    }
  };

  redactObject(copy);
  return copy;
};

module.exports = {
  calculateNextRunAt,
  shouldRetry,
  sanitizeJobData,
  DEFAULT_MAX_RETRIES
};
