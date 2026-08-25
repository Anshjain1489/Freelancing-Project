const MAX_LATENCY_HISTORY = 1000;

let totalRequests = 0;
let slowRequestsWarn = 0; // > 500ms
let slowRequestsSlow = 0; // > 1000ms
let slowRequestsCritical = 0; // > 3000ms
let totalDurationMs = 0;
let maxLatencyMs = 0;
const recentDurations = [];

/**
 * Record an HTTP request duration
 */
const recordRequest = (durationMs) => {
  totalRequests++;
  totalDurationMs += durationMs;

  if (durationMs > maxLatencyMs) {
    maxLatencyMs = durationMs;
  }

  if (durationMs > 3000) {
    slowRequestsCritical++;
    slowRequestsSlow++;
    slowRequestsWarn++;
  } else if (durationMs > 1000) {
    slowRequestsSlow++;
    slowRequestsWarn++;
  } else if (durationMs > 500) {
    slowRequestsWarn++;
  }

  recentDurations.push(durationMs);
  if (recentDurations.length > MAX_LATENCY_HISTORY) {
    recentDurations.shift(); // Bounded rolling history
  }
};

/**
 * Get aggregated performance metrics for readiness diagnostics
 */
const getMetrics = () => {
  const avgLatencyMs = totalRequests > 0 ? parseFloat((totalDurationMs / totalRequests).toFixed(2)) : 0;
  
  // Calculate P95 and P99 latency estimate from recent durations
  let p95Ms = 0;
  let p99Ms = 0;

  if (recentDurations.length > 0) {
    const sorted = [...recentDurations].sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p99Idx = Math.floor(sorted.length * 0.99);
    p95Ms = parseFloat((sorted[p95Idx] || sorted[sorted.length - 1]).toFixed(2));
    p99Ms = parseFloat((sorted[p99Idx] || sorted[sorted.length - 1]).toFixed(2));
  }

  return {
    totalRequests,
    averageLatencyMs: avgLatencyMs,
    maxLatencyMs: parseFloat(maxLatencyMs.toFixed(2)),
    p95LatencyMs: p95Ms,
    p99LatencyMs: p99Ms,
    slowRequests: slowRequestsWarn,
    slowRequestsWarn,
    slowRequestsSlow,
    slowRequestsCritical
  };
};

/**
 * Reset metrics (useful for testing)
 */
const resetMetricsForTests = () => {
  totalRequests = 0;
  slowRequestsWarn = 0;
  slowRequestsSlow = 0;
  slowRequestsCritical = 0;
  totalDurationMs = 0;
  maxLatencyMs = 0;
  recentDurations.length = 0;
};

module.exports = {
  recordRequest,
  getMetrics,
  resetMetricsForTests
};
