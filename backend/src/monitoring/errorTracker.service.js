const crypto = require('crypto');
const { redactSensitiveData } = require('./structuredLogger');

const MAX_ERROR_TYPES = 200;
const errorStore = new Map();
let totalErrorEvents = 0;

/**
 * Generate a stable fingerprint hash for an error based on name, message, and top stack line
 */
function generateFingerprint(error) {
  const name = (error && error.name) ? String(error.name) : 'Error';
  const msg = (error && error.message) ? String(error.message).replace(/[0-9a-fA-F-]{36}/g, '<UUID>') : 'Unknown Error';
  
  let topStack = '';
  if (error && error.stack) {
    const stackLines = String(error.stack).split('\n');
    topStack = stackLines[1] ? stackLines[1].trim() : '';
  }

  const raw = `${name}:${msg}:${topStack}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * Capture an error occurrence with safe context
 */
function captureError(error, context = {}) {
  try {
    totalErrorEvents++;
    const errObj = error instanceof Error ? error : new Error(String(error || 'Unknown Error'));
    const fingerprint = generateFingerprint(errObj);
    const now = new Date().toISOString();
    const sanitizedContext = redactSensitiveData(context);

    const severity = context.statusCode >= 500 || context.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING';

    if (errorStore.has(fingerprint)) {
      const existing = errorStore.get(fingerprint);
      existing.occurrenceCount++;
      existing.lastSeen = now;
      existing.lastContext = sanitizedContext;
      if (severity === 'CRITICAL') existing.severity = 'CRITICAL';
      return existing;
    }

    // Evict oldest if map is full
    if (errorStore.size >= MAX_ERROR_TYPES) {
      const firstKey = errorStore.keys().next().value;
      errorStore.delete(firstKey);
    }

    const record = {
      fingerprint,
      name: errObj.name || 'Error',
      message: errObj.message || 'Unknown Error',
      stack: errObj.stack ? errObj.stack.split('\n').slice(0, 5).join('\n') : '',
      component: context.component || context.path || 'application',
      requestId: context.requestId || null,
      severity,
      occurrenceCount: 1,
      firstSeen: now,
      lastSeen: now,
      lastContext: sanitizedContext
    };

    errorStore.set(fingerprint, record);
    return record;
  } catch (err) {
    // Fail-safe: error logging must never crash app
    return null;
  }
}

/**
 * Get aggregate error tracking stats
 */
function getStats() {
  const distinctErrors = errorStore.size;
  let criticalCount = 0;
  let warningCount = 0;

  for (const record of errorStore.values()) {
    if (record.severity === 'CRITICAL') criticalCount += record.occurrenceCount;
    else warningCount += record.occurrenceCount;
  }

  return {
    totalErrorEvents,
    distinctErrorTypes: distinctErrors,
    criticalErrorEvents: criticalCount,
    warningErrorEvents: warningCount
  };
}

/**
 * Get list of recent error records ordered by lastSeen
 */
function getRecentErrors(limit = 20) {
  const records = Array.from(errorStore.values());
  records.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  return records.slice(0, limit);
}

/**
 * Reset error tracker state for tests
 */
function clearForTests() {
  errorStore.clear();
  totalErrorEvents = 0;
}

module.exports = {
  captureError,
  getStats,
  getRecentErrors,
  clearForTests,
  generateFingerprint
};
