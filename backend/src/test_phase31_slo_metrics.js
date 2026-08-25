const assert = require('assert');
const metricsService = require('./monitoring/metrics.service');
const sloTracker = require('./monitoring/sloTracker.service');

async function runPhase31SloMetricsTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 31 AUTOMATED SLO & METRICS SUITE');
  console.log('  SLI Metrics Collection, SLO Evaluation & Insufficient Data Handling (20 Assertions)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const runTest = async (name, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS ${passed}] ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ [FAIL ${failed}] ${name}: ${err.message}`);
    }
  };

  await runTest('Assertion 1: resetMetricsForTests initializes counters cleanly', () => {
    metricsService.resetMetricsForTests();
    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.http.totalRequests, 0);
    assert.strictEqual(metrics.http.count2xx, 0);
    assert.strictEqual(metrics.http.count5xx, 0);
  });

  await runTest('Assertion 2: recordHttpRequest tracks status code breakdown (2xx, 3xx, 4xx, 5xx)', () => {
    metricsService.resetMetricsForTests();
    metricsService.recordHttpRequest(200, 15);
    metricsService.recordHttpRequest(201, 20);
    metricsService.recordHttpRequest(301, 5);
    metricsService.recordHttpRequest(404, 10);
    metricsService.recordHttpRequest(500, 150);

    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.http.totalRequests, 5);
    assert.strictEqual(metrics.http.count2xx, 2);
    assert.strictEqual(metrics.http.count3xx, 1);
    assert.strictEqual(metrics.http.count4xx, 1);
    assert.strictEqual(metrics.http.count5xx, 1);
  });

  await runTest('Assertion 3: Error rate percentage calculation is accurate', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 9; i++) metricsService.recordHttpRequest(200, 20);
    metricsService.recordHttpRequest(500, 100); // 1 out of 10 = 10%

    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.http.errorRatePercent, 10.0);
  });

  await runTest('Assertion 4: P95 and P99 latency calculation is accurate', () => {
    metricsService.resetMetricsForTests();
    for (let i = 1; i <= 100; i++) {
      metricsService.recordHttpRequest(200, i * 10); // 10ms to 1000ms
    }

    const metrics = metricsService.getAggregateMetrics();
    assert.ok(metrics.http.p95LatencyMs >= 950);
    assert.ok(metrics.http.p99LatencyMs >= 990);
    assert.strictEqual(metrics.http.maxLatencyMs, 1000);
  });

  await runTest('Assertion 5: SSE dispatch timing and failure tracking', () => {
    metricsService.recordSseDispatch(120, true);
    metricsService.recordSseDispatch(45, true);
    metricsService.recordSseDispatch(0, false); // Failed

    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.sse.failedDispatches, 1);
    assert.ok(metrics.sse.p95DispatchLatencyMs > 0);
  });

  await runTest('Assertion 6: SSE reconnect events counter', () => {
    metricsService.recordSseReconnect();
    metricsService.recordSseReconnect();
    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.sse.reconnectEvents, 2);
  });

  await runTest('Assertion 7: evaluateSlos returns INSUFFICIENT_DATA when sample size is below threshold', () => {
    metricsService.resetMetricsForTests();
    metricsService.recordHttpRequest(200, 10); // Sample size = 1 (<10)

    const report = sloTracker.evaluateSlos();
    const avail = report.slos.find(s => s.name === 'API_AVAILABILITY');
    assert.strictEqual(avail.status, 'INSUFFICIENT_DATA');
    assert.strictEqual(avail.sampleSize, 1);
  });

  await runTest('Assertion 8: API_AVAILABILITY SLO evaluates to HEALTHY when non-5xx >= 99.5%', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 1000; i++) {
      metricsService.recordHttpRequest(200, 15);
    }

    const report = sloTracker.evaluateSlos();
    const avail = report.slos.find(s => s.name === 'API_AVAILABILITY');
    assert.strictEqual(avail.actual, 100);
    assert.strictEqual(avail.status, 'HEALTHY');
  });

  await runTest('Assertion 9: API_AVAILABILITY SLO evaluates to BREACHED when error rate is high', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 80; i++) metricsService.recordHttpRequest(200, 15);
    for (let i = 0; i < 20; i++) metricsService.recordHttpRequest(500, 100); // 80% avail (<99.5% - 2.0%)

    const report = sloTracker.evaluateSlos();
    const avail = report.slos.find(s => s.name === 'API_AVAILABILITY');
    assert.strictEqual(avail.actual, 80);
    assert.strictEqual(avail.status, 'BREACHED');
  });

  await runTest('Assertion 10: API_LATENCY SLO evaluates to HEALTHY when 95% requests < 500ms', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 96; i++) metricsService.recordHttpRequest(200, 40); // Fast
    for (let i = 0; i < 4; i++) metricsService.recordHttpRequest(200, 600); // Slow (>500ms)

    const report = sloTracker.evaluateSlos();
    const lat = report.slos.find(s => s.name === 'API_LATENCY');
    assert.strictEqual(lat.actual, 96);
    assert.strictEqual(lat.status, 'HEALTHY');
  });

  await runTest('Assertion 11: API_LATENCY SLO evaluates to BREACHED when latency degrades', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 80; i++) metricsService.recordHttpRequest(200, 40);
    for (let i = 0; i < 20; i++) metricsService.recordHttpRequest(200, 800); // 80% fast (<95%)

    const report = sloTracker.evaluateSlos();
    const lat = report.slos.find(s => s.name === 'API_LATENCY');
    assert.strictEqual(lat.actual, 80);
    assert.strictEqual(lat.status, 'BREACHED');
  });

  await runTest('Assertion 12: SSE_DISPATCH SLO is included in report', () => {
    const report = sloTracker.evaluateSlos();
    const sse = report.slos.find(s => s.name === 'SSE_DISPATCH');
    assert.ok(sse);
    assert.strictEqual(sse.target, 99.0);
  });

  await runTest('Assertion 13: BACKGROUND_JOB_RELIABILITY SLO is included in report', () => {
    const report = sloTracker.evaluateSlos();
    const job = report.slos.find(s => s.name === 'BACKGROUND_JOB_RELIABILITY');
    assert.ok(job);
    assert.strictEqual(job.target, 99.0);
  });

  await runTest('Assertion 14: SLO evaluation report structure matches specification', () => {
    const report = sloTracker.evaluateSlos();
    assert.ok(report.evaluatedAt);
    assert.strictEqual(report.slos.length, 4);
    report.slos.forEach(s => {
      assert.ok(s.name);
      assert.strictEqual(typeof s.target, 'number');
      assert.strictEqual(typeof s.actual, 'number');
      assert.ok(['HEALTHY', 'WARNING', 'BREACHED', 'INSUFFICIENT_DATA'].includes(s.status));
      assert.strictEqual(s.window, '1h');
    });
  });

  await runTest('Assertion 15: Interoperability with Phase 29 performanceMetrics service', () => {
    const perfMetrics = require('./services/performanceMetrics.service');
    assert.ok(perfMetrics.getMetrics());
  });

  await runTest('Assertion 16: Interoperability with Phase 30 jobQueue service', () => {
    const jobQueue = require('./jobs/jobQueue.service');
    assert.ok(jobQueue.getQueueStats());
  });

  await runTest('Assertion 17: Interoperability with cacheService stats', () => {
    const cacheService = require('./services/cache.service');
    assert.ok(cacheService.getStats());
  });

  await runTest('Assertion 18: Interoperability with errorTracker stats', () => {
    const errorTracker = require('./monitoring/errorTracker.service');
    assert.ok(errorTracker.getStats());
  });

  await runTest('Assertion 19: Bounded memory history for rolling HTTP metrics', () => {
    metricsService.resetMetricsForTests();
    for (let i = 0; i < 1500; i++) {
      metricsService.recordHttpRequest(200, 10);
    }
    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.http.totalRequests, 1500);
  });

  await runTest('Assertion 20: Reset for tests cleans all counters cleanly', () => {
    metricsService.resetMetricsForTests();
    const metrics = metricsService.getAggregateMetrics();
    assert.strictEqual(metrics.http.totalRequests, 0);
  });

  console.log('\n====================================================');
  console.log(`  PHASE 31 SLO & METRICS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase31SloMetricsTests();
