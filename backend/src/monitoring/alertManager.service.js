const crypto = require('crypto');
const metricsService = require('./metrics.service');
const sloTracker = require('./sloTracker.service');
const { redactSensitiveData } = require('./structuredLogger');

const MAX_ALERT_HISTORY = 100;
const alertStore = new Map();

/**
 * Helper to update or create an alert with deduplication
 */
function recordOrUpdateAlert(ruleName, severity, message, metadata = {}) {
  const now = new Date().toISOString();
  const sanitizedMeta = redactSensitiveData(metadata);

  if (alertStore.has(ruleName)) {
    const existing = alertStore.get(ruleName);
    if (existing.state === 'ACTIVE') {
      existing.occurrenceCount++;
      existing.lastTriggered = now;
      existing.message = message;
      existing.severity = severity;
      existing.metadata = sanitizedMeta;
      return existing;
    }
  }

  // Evict oldest if full
  if (alertStore.size >= MAX_ALERT_HISTORY) {
    const oldestKey = alertStore.keys().next().value;
    alertStore.delete(oldestKey);
  }

  const alertObj = {
    id: `alt-${crypto.randomBytes(6).toString('hex')}`,
    ruleName,
    severity,
    message,
    firstTriggered: now,
    lastTriggered: now,
    occurrenceCount: 1,
    state: 'ACTIVE',
    metadata: sanitizedMeta
  };

  alertStore.set(ruleName, alertObj);
  return alertObj;
}

/**
 * Helper to resolve an active alert if condition cleared
 */
function resolveAlertIfActive(ruleName) {
  if (alertStore.has(ruleName)) {
    const existing = alertStore.get(ruleName);
    if (existing.state === 'ACTIVE') {
      existing.state = 'RESOLVED';
      existing.resolvedAt = new Date().toISOString();
    }
  }
}

/**
 * Evaluate all system alert rules
 */
function evaluateAlerts() {
  const metrics = metricsService.getAggregateMetrics();
  const sloReport = sloTracker.evaluateSlos();

  // 1. API_HIGH_ERROR_RATE Rule (>5.0% 5xx rate)
  if (metrics.http.totalRequests >= 5 && metrics.http.errorRatePercent > 5.0) {
    recordOrUpdateAlert(
      'API_HIGH_ERROR_RATE',
      'CRITICAL',
      `HTTP 5xx error rate (${metrics.http.errorRatePercent}%) breached threshold (5.0%)`,
      { errorRatePercent: metrics.http.errorRatePercent, count5xx: metrics.http.count5xx }
    );
  } else {
    resolveAlertIfActive('API_HIGH_ERROR_RATE');
  }

  // 2. API_SLOW_LATENCY Rule (P95 > 1000ms)
  if (metrics.http.p95LatencyMs > 1000) {
    recordOrUpdateAlert(
      'API_SLOW_LATENCY',
      'WARNING',
      `HTTP P95 latency (${metrics.http.p95LatencyMs}ms) breached threshold (1000ms)`,
      { p95LatencyMs: metrics.http.p95LatencyMs }
    );
  } else {
    resolveAlertIfActive('API_SLOW_LATENCY');
  }

  // 3. SLO_BREACH Rule
  const breachedSlos = sloReport.slos.filter(s => s.status === 'BREACHED');
  if (breachedSlos.length > 0) {
    const names = breachedSlos.map(s => s.name).join(', ');
    recordOrUpdateAlert(
      'SLO_BREACH',
      'CRITICAL',
      `SLO breach detected in: [${names}]`,
      { breachedSlos }
    );
  } else {
    resolveAlertIfActive('SLO_BREACH');
  }

  // 4. JOB_DEAD_LETTER_ALERT Rule
  const deadCount = (metrics.jobs && (metrics.jobs.dead_letter || metrics.jobs.deadLetter)) || 0;
  if (deadCount > 0) {
    recordOrUpdateAlert(
      'JOB_DEAD_LETTER_ALERT',
      'WARNING',
      `Dead-letter background queue contains ${deadCount} failed job(s)`,
      { deadLetterCount: deadCount }
    );
  } else {
    resolveAlertIfActive('JOB_DEAD_LETTER_ALERT');
  }

  // 5. SSE_RECONNECT_STORM Rule (>50 reconnects)
  if (metrics.sse.reconnectEvents > 50) {
    recordOrUpdateAlert(
      'SSE_RECONNECT_STORM',
      'WARNING',
      `High SSE reconnection activity detected (${metrics.sse.reconnectEvents} reconnect events)`,
      { reconnectEvents: metrics.sse.reconnectEvents }
    );
  } else {
    resolveAlertIfActive('SSE_RECONNECT_STORM');
  }

  return getActiveAlerts();
}

/**
 * Manually record an alert (useful for slow DB query alerts or custom triggers)
 */
function triggerManualAlert(ruleName, severity, message, metadata = {}) {
  return recordOrUpdateAlert(ruleName, severity, message, metadata);
}

/**
 * Get active alerts
 */
function getActiveAlerts() {
  return Array.from(alertStore.values()).filter(a => a.state === 'ACTIVE');
}

/**
 * Get complete alert history (active & resolved)
 */
function getAlertHistory(limit = 50) {
  const list = Array.from(alertStore.values());
  list.sort((a, b) => new Date(b.lastTriggered) - new Date(a.lastTriggered));
  return list.slice(0, limit);
}

/**
 * Reset alert store for testing
 */
function clearForTests() {
  alertStore.clear();
}

module.exports = {
  evaluateAlerts,
  triggerManualAlert,
  getActiveAlerts,
  getAlertHistory,
  clearForTests
};
