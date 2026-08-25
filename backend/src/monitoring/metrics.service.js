const performanceMetrics = require('../services/performanceMetrics.service');
const errorTracker = require('./errorTracker.service');

// HTTP Status breakdown counters
let count2xx = 0;
let count3xx = 0;
let count4xx = 0;
let count5xx = 0;

// SSE Dispatch timing history (bounded)
const MAX_SSE_LATENCY_SAMPLES = 500;
const sseDispatchLatencies = [];
let sseDispatchFailures = 0;
let sseReconnectEvents = 0;

/**
 * Record an incoming HTTP request execution outcome
 */
function recordHttpRequest(statusCode, durationMs) {
  // Update Phase 29 performance metrics
  performanceMetrics.recordRequest(durationMs);

  if (statusCode >= 500) count5xx++;
  else if (statusCode >= 400) count4xx++;
  else if (statusCode >= 300) count3xx++;
  else count2xx++;
}

/**
 * Record SSE dispatch timing
 */
function recordSseDispatch(durationMs, success = true) {
  if (!success) {
    sseDispatchFailures++;
  } else if (typeof durationMs === 'number') {
    sseDispatchLatencies.push(durationMs);
    if (sseDispatchLatencies.length > MAX_SSE_LATENCY_SAMPLES) {
      sseDispatchLatencies.shift();
    }
  }
}

/**
 * Record SSE reconnect event
 */
function recordSseReconnect() {
  sseReconnectEvents++;
}

/**
 * Gather complete aggregated metrics snapshot
 */
function getAggregateMetrics() {
  const perf = performanceMetrics.getMetrics();
  const totalHttp = perf.totalRequests;
  const errorRate = totalHttp > 0 ? parseFloat(((count5xx / totalHttp) * 100).toFixed(2)) : 0;

  // SSE Stats via sse.manager if available
  let sseManagerStats = { activeUsers: 0, activeConnections: 0 };
  try {
    const sseManager = require('../notifications/sse.manager');
    if (sseManager && typeof sseManager.getStats === 'function') {
      sseManagerStats = sseManager.getStats();
    }
  } catch (e) {}

  let sseP95 = 0;
  if (sseDispatchLatencies.length > 0) {
    const sorted = [...sseDispatchLatencies].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    sseP95 = parseFloat((sorted[idx] || sorted[sorted.length - 1]).toFixed(2));
  }

  // Job Queue Stats via jobQueue if available
  let jobStats = { pending: 0, processing: 0, completed: 0, retrying: 0, failed: 0, dead_letter: 0, total: 0, successRate: 100 };
  try {
    const jobQueue = require('../jobs/jobQueue.service');
    if (jobQueue && typeof jobQueue.getQueueStats === 'function') {
      jobStats = jobQueue.getQueueStats();
    }
  } catch (e) {}

  // Cache Stats via cache.service if available
  let cacheStats = { hits: 0, misses: 0, hitRatio: 0, keysCount: 0 };
  try {
    const cacheService = require('../services/cache.service');
    if (cacheService && typeof cacheService.getStats === 'function') {
      cacheStats = cacheService.getStats();
    }
  } catch (e) {}

  const errorStats = errorTracker.getStats();

  return {
    http: {
      totalRequests: totalHttp,
      count2xx,
      count3xx,
      count4xx,
      count5xx,
      errorRatePercent: errorRate,
      averageLatencyMs: perf.averageLatencyMs,
      p50LatencyMs: perf.p50LatencyMs || perf.averageLatencyMs,
      p95LatencyMs: perf.p95LatencyMs,
      p99LatencyMs: perf.p99LatencyMs,
      maxLatencyMs: perf.maxLatencyMs,
      slowRequests: perf.slowRequests
    },
    sse: {
      activeUsersCount: sseManagerStats.activeUsers || 0,
      activeConnectionsCount: sseManagerStats.activeConnections || 0,
      reconnectEvents: sseReconnectEvents,
      failedDispatches: sseDispatchFailures,
      p95DispatchLatencyMs: sseP95
    },
    jobs: jobStats,
    cache: cacheStats,
    errors: errorStats
  };
}

/**
 * Reset all metrics for testing
 */
function resetMetricsForTests() {
  count2xx = 0;
  count3xx = 0;
  count4xx = 0;
  count5xx = 0;
  sseDispatchLatencies.length = 0;
  sseDispatchFailures = 0;
  sseReconnectEvents = 0;
  performanceMetrics.resetMetricsForTests();
  errorTracker.clearForTests();
}

module.exports = {
  recordHttpRequest,
  recordSseDispatch,
  recordSseReconnect,
  getAggregateMetrics,
  resetMetricsForTests
};
