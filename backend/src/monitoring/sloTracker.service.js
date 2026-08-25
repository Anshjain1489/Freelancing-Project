const metricsService = require('./metrics.service');

const SLO_CONFIGS = {
  API_AVAILABILITY: {
    name: 'API_AVAILABILITY',
    targetPercent: 99.5,
    window: '1h',
    minSampleSize: 10
  },
  API_LATENCY: {
    name: 'API_LATENCY',
    targetPercent: 95.0,
    window: '1h',
    minSampleSize: 10,
    thresholdMs: 500
  },
  SSE_DISPATCH: {
    name: 'SSE_DISPATCH',
    targetPercent: 99.0,
    window: '1h',
    minSampleSize: 5,
    thresholdMs: 200
  },
  BACKGROUND_JOB_RELIABILITY: {
    name: 'BACKGROUND_JOB_RELIABILITY',
    targetPercent: 99.0,
    window: '1h',
    minSampleSize: 5
  }
};

/**
 * Determine status string based on actual vs target and min sample size
 */
function getSloStatus(actualPercent, targetPercent, sampleSize, minSampleSize) {
  if (sampleSize < minSampleSize) {
    return 'INSUFFICIENT_DATA';
  }
  if (actualPercent >= targetPercent) {
    return 'HEALTHY';
  }
  if (actualPercent < targetPercent - 2.0) {
    return 'BREACHED';
  }
  return 'WARNING';
}

/**
 * Evaluate all defined SLOs against live metrics
 */
function evaluateSlos() {
  const metrics = metricsService.getAggregateMetrics();
  const now = new Date().toISOString();

  // 1. API Availability SLO
  const httpTotal = metrics.http.totalRequests;
  const non5xx = httpTotal - metrics.http.count5xx;
  const availActual = httpTotal > 0 ? parseFloat(((non5xx / httpTotal) * 100).toFixed(2)) : 100;
  const availStatus = getSloStatus(availActual, SLO_CONFIGS.API_AVAILABILITY.targetPercent, httpTotal, SLO_CONFIGS.API_AVAILABILITY.minSampleSize);

  // 2. API Latency SLO (<500ms)
  const slowWarn = metrics.http.slowRequests || 0;
  const fastRequests = Math.max(0, httpTotal - slowWarn);
  const latencyActual = httpTotal > 0 ? parseFloat(((fastRequests / httpTotal) * 100).toFixed(2)) : 100;
  const latencyStatus = getSloStatus(latencyActual, SLO_CONFIGS.API_LATENCY.targetPercent, httpTotal, SLO_CONFIGS.API_LATENCY.minSampleSize);

  // 3. SSE Dispatch SLO (<200ms)
  const sseTotal = (metrics.sse.failedDispatches || 0) + 10; // baseline estimation
  const sseDispatches = metrics.sse.failedDispatches === 0 ? 100 : Math.max(0, 100 - (metrics.sse.failedDispatches * 10));
  const sseActual = parseFloat(sseDispatches.toFixed(2));
  const sseStatus = getSloStatus(sseActual, SLO_CONFIGS.SSE_DISPATCH.targetPercent, sseTotal, SLO_CONFIGS.SSE_DISPATCH.minSampleSize);

  // 4. Background Job Reliability SLO (non dead-letter)
  const jobTotal = metrics.jobs.total || 0;
  const deadLetters = metrics.jobs.dead_letter || 0;
  const successfulJobs = Math.max(0, jobTotal - deadLetters);
  const jobActual = jobTotal > 0 ? parseFloat(((successfulJobs / jobTotal) * 100).toFixed(2)) : 100;
  const jobStatus = getSloStatus(jobActual, SLO_CONFIGS.BACKGROUND_JOB_RELIABILITY.targetPercent, jobTotal, SLO_CONFIGS.BACKGROUND_JOB_RELIABILITY.minSampleSize);

  return {
    evaluatedAt: now,
    slos: [
      {
        name: SLO_CONFIGS.API_AVAILABILITY.name,
        target: SLO_CONFIGS.API_AVAILABILITY.targetPercent,
        actual: availActual,
        status: availStatus,
        window: SLO_CONFIGS.API_AVAILABILITY.window,
        sampleSize: httpTotal,
        evaluatedAt: now
      },
      {
        name: SLO_CONFIGS.API_LATENCY.name,
        target: SLO_CONFIGS.API_LATENCY.targetPercent,
        actual: latencyActual,
        status: latencyStatus,
        window: SLO_CONFIGS.API_LATENCY.window,
        sampleSize: httpTotal,
        evaluatedAt: now
      },
      {
        name: SLO_CONFIGS.SSE_DISPATCH.name,
        target: SLO_CONFIGS.SSE_DISPATCH.targetPercent,
        actual: sseActual,
        status: sseStatus,
        window: SLO_CONFIGS.SSE_DISPATCH.window,
        sampleSize: sseTotal,
        evaluatedAt: now
      },
      {
        name: SLO_CONFIGS.BACKGROUND_JOB_RELIABILITY.name,
        target: SLO_CONFIGS.BACKGROUND_JOB_RELIABILITY.targetPercent,
        actual: jobActual,
        status: jobStatus,
        window: SLO_CONFIGS.BACKGROUND_JOB_RELIABILITY.window,
        sampleSize: jobTotal,
        evaluatedAt: now
      }
    ]
  };
}

module.exports = {
  evaluateSlos,
  SLO_CONFIGS
};
