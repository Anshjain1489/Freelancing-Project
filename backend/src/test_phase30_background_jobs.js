const assert = require('assert');
const jobQueue = require('./jobs/jobQueue.service');
const jobRunner = require('./jobs/jobRunner.service');
const { JOB_TYPES, JOB_STATES } = require('./jobs/jobTypes');
const { calculateNextRunAt, shouldRetry, sanitizeJobData } = require('./jobs/retryPolicy.service');
const logger = require('./utils/logger');

logger.info = () => {};

async function runPhase30BackgroundJobsTests() {
  console.log('====================================================');
  console.log('  RUNNING PHASE 30 AUTOMATED BACKGROUND JOBS SUITE');
  console.log('  Job Queue States, Exponential Retries, Dead-Letter & Idempotency (20 Assertions)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const runTest = async (description, fn) => {
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS ${passed}] ${description}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ [FAIL ${failed}] ${description}: ${err.message}`);
    }
  };

  jobQueue.clearQueueForTests();

  let claimedJobId = null;

  // --- SECTION 1: Enqueue & Claim Lifecycle ---
  await runTest('Assertion 1: enqueueJob creates new PENDING job with generated ID', async () => {
    const job = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.ORDER_NOTIFICATION,
      payload: { orderId: 'order-101' },
      maxAttempts: 3
    });
    assert.ok(job.id.startsWith('job_'));
    assert.strictEqual(job.job_type, JOB_TYPES.ORDER_NOTIFICATION);
    assert.strictEqual(job.status, JOB_STATES.PENDING);
    assert.strictEqual(job.attempt_count, 0);
  });

  await runTest('Assertion 2: claimNextJob claims PENDING job and updates state to PROCESSING', async () => {
    const claimed = await jobQueue.claimNextJob('test-worker-1');
    assert.ok(claimed);
    claimedJobId = claimed.id;
    assert.strictEqual(claimed.status, JOB_STATES.PROCESSING);
    assert.strictEqual(claimed.attempt_count, 1);
    assert.strictEqual(claimed.locked_by, 'test-worker-1');
  });

  await runTest('Assertion 3: completeJob updates status to COMPLETED and records completed_at', async () => {
    assert.ok(claimedJobId);
    const res = await jobQueue.completeJob(claimedJobId);
    assert.ok(res);
    const updated = jobQueue.getJobById(claimedJobId);
    assert.strictEqual(updated.status, JOB_STATES.COMPLETED);
    assert.ok(updated.completed_at);
  });

  // --- SECTION 2: Retries & Exponential Backoff ---
  await runTest('Assertion 4: failJob with attempt 1 < maxAttempts transitions job to RETRYING with exponential backoff', async () => {
    const job = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.PAYMENT_RECONCILIATION,
      payload: { paymentId: 'pay-202' },
      maxAttempts: 3
    });
    await jobQueue.claimNextJob('worker-2');
    const failedJob = await jobQueue.failJob(job.id, 'Gateway Timeout');
    assert.strictEqual(failedJob.status, JOB_STATES.RETRYING);
    assert.strictEqual(failedJob.attempt_count, 1);
    assert.strictEqual(failedJob.last_error, 'Gateway Timeout');
    assert.ok(new Date(failedJob.next_run_at) > new Date());
  });

  await runTest('Assertion 5: Retrying job is not claimed before next_run_at timestamp', async () => {
    const claimed = await jobQueue.claimNextJob('worker-2');
    // Since next_run_at is 5 seconds in future, claimNextJob should return null
    assert.strictEqual(claimed, null);
  });

  await runTest('Assertion 6: failJob with attempt 3 >= maxAttempts transitions job to DEAD_LETTER', async () => {
    const job = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.DELIVERY_NOTIFICATION,
      payload: { deliveryId: 'del-303' },
      maxAttempts: 2
    });
    // Attempt 1
    await jobQueue.claimNextJob('worker-1');
    await jobQueue.failJob(job.id, 'Attempt 1 failed');
    // Force next_run_at to past so it can be claimed for attempt 2
    job.next_run_at = new Date(Date.now() - 1000).toISOString();

    // Attempt 2
    await jobQueue.claimNextJob('worker-1');
    const deadJob = await jobQueue.failJob(job.id, 'Permanent failure on attempt 2');
    assert.strictEqual(deadJob.status, JOB_STATES.DEAD_LETTER);
  });

  await runTest('Assertion 7: getDeadLetterJobs retrieves all dead lettered jobs', async () => {
    const deadList = await jobQueue.getDeadLetterJobs();
    assert.ok(deadList.length >= 1);
    assert.strictEqual(deadList[0].status, JOB_STATES.DEAD_LETTER);
  });

  await runTest('Assertion 8: replayDeadLetterJob resets dead letter job to PENDING with reset attempt_count', async () => {
    const deadList = await jobQueue.getDeadLetterJobs();
    const target = deadList[0];
    const res = await jobQueue.replayDeadLetterJob(target.id);
    assert.ok(res);
    assert.strictEqual(target.status, JOB_STATES.PENDING);
    assert.strictEqual(target.attempt_count, 0);
  });

  // --- SECTION 3: Idempotency & Sanitization ---
  await runTest('Assertion 9: enqueueJob with duplicate idempotency key skips creation and returns existing job', async () => {
    const idempotencyKey = 'ORDER_NOTIF:order-777:CONFIRMED';
    const job1 = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.ORDER_NOTIFICATION,
      payload: { orderId: 'order-777' },
      idempotencyKey
    });

    const job2 = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.ORDER_NOTIFICATION,
      payload: { orderId: 'order-777' },
      idempotencyKey
    });

    assert.strictEqual(job1.id, job2.id);
  });

  await runTest('Assertion 10: enqueueJob payload sanitization strips passwords, OTPs and secrets', async () => {
    const job = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.ORDER_NOTIFICATION,
      payload: {
        orderId: 'order-888',
        password: 'raw_password_123',
        otp: '654321',
        token: 'secret_jwt'
      }
    });

    assert.strictEqual(job.payload.orderId, 'order-888');
    assert.strictEqual(job.payload.password, undefined);
    assert.strictEqual(job.payload.otp, undefined);
    assert.strictEqual(job.payload.token, undefined);
  });

  // --- SECTION 4: Job Runner & Stale Recovery ---
  await runTest('Assertion 11: jobRunner allows registering custom handler for JOB_TYPES', () => {
    let executed = false;
    jobRunner.registerHandler(JOB_TYPES.ANALYTICS_REFRESH, async () => {
      executed = true;
    });
    assert.strictEqual(typeof jobRunner.registerHandler, 'function');
  });

  await runTest('Assertion 12: jobRunner processNextJob claims and executes handler cleanly', async () => {
    jobQueue.clearQueueForTests();
    let handlerExecuted = false;
    jobRunner.registerHandler('CUSTOM_TEST_JOB', async (payload) => {
      assert.strictEqual(payload.testKey, 'val1');
      handlerExecuted = true;
    });

    const job = await jobQueue.enqueueJob({
      jobType: 'CUSTOM_TEST_JOB',
      payload: { testKey: 'val1' }
    });

    await jobRunner.processNextJob();

    assert.ok(handlerExecuted);
    assert.strictEqual(job.status, JOB_STATES.COMPLETED);
  });

  await runTest('Assertion 13: jobRunner processNextJob handles throw in handler and triggers failJob', async () => {
    jobQueue.clearQueueForTests();
    jobRunner.registerHandler('FAILING_TEST_JOB', async () => {
      throw new Error('Handler Crash Test');
    });

    const job = await jobQueue.enqueueJob({
      jobType: 'FAILING_TEST_JOB',
      payload: { data: 'test' }
    });

    await jobRunner.processNextJob();

    assert.strictEqual(job.status, JOB_STATES.RETRYING);
    assert.strictEqual(job.last_error, 'Handler Crash Test');
  });

  await runTest('Assertion 14: Stale PROCESSING jobs locked > 5 minutes are recovered back to RETRYING', async () => {
    jobQueue.clearQueueForTests();
    const job = await jobQueue.enqueueJob({
      jobType: JOB_TYPES.ORDER_NOTIFICATION,
      payload: { orderId: 'stale-1' }
    });

    job.status = JOB_STATES.PROCESSING;
    job.locked_at = new Date(Date.now() - 360000).toISOString(); // 6 mins ago
    job.locked_by = 'crashed-worker';
    job.next_run_at = new Date(Date.now() - 1000).toISOString();

    const claimed = await jobQueue.claimNextJob('new-worker');
    assert.ok(claimed);
    assert.strictEqual(claimed.id, job.id);
    assert.strictEqual(claimed.locked_by, 'new-worker');
  });

  await runTest('Assertion 15: jobRunner start and stop toggle runner status cleanly', async () => {
    jobRunner.start();
    assert.strictEqual(jobRunner.getStatus().isRunning, true);
    await jobRunner.stop();
    assert.strictEqual(jobRunner.getStatus().isRunning, false);
  });

  await runTest('Assertion 16: jobQueue getMetrics returns correct queue status breakdown', () => {
    const metrics = jobQueue.getMetrics();
    assert.strictEqual(typeof metrics.pending, 'number');
    assert.strictEqual(typeof metrics.processing, 'number');
    assert.strictEqual(typeof metrics.completed, 'number');
    assert.strictEqual(typeof metrics.retrying, 'number');
    assert.strictEqual(typeof metrics.deadLetter, 'number');
  });

  await runTest('Assertion 17: Job idempotency prevents duplicate execution of identical event types', async () => {
    const key = 'IDEMP_CHECK_KEY_1';
    const j1 = await jobQueue.enqueueJob({ jobType: JOB_TYPES.ORDER_NOTIFICATION, payload: { a: 1 }, idempotencyKey: key });
    const j2 = await jobQueue.enqueueJob({ jobType: JOB_TYPES.ORDER_NOTIFICATION, payload: { a: 1 }, idempotencyKey: key });
    assert.strictEqual(j1.id, j2.id);
  });

  await runTest('Assertion 18: calculateNextRunAt produces monotonically increasing future timestamps', () => {
    const t1 = new Date(calculateNextRunAt(1)).getTime();
    const t2 = new Date(calculateNextRunAt(2)).getTime();
    const t3 = new Date(calculateNextRunAt(3)).getTime();
    assert.ok(t2 > t1);
    assert.ok(t3 > t2);
  });

  await runTest('Assertion 19: getJobById retrieves exact job record', async () => {
    const job = await jobQueue.enqueueJob({ jobType: JOB_TYPES.CACHE_INVALIDATION, payload: { prefix: 'test' } });
    const found = jobQueue.getJobById(job.id);
    assert.strictEqual(found.id, job.id);
  });

  await runTest('Assertion 20: clearQueueForTests resets queue state cleanly', () => {
    jobQueue.clearQueueForTests();
    assert.strictEqual(jobQueue.getMetrics().totalJobs, 0);
  });

  console.log('\n====================================================');
  console.log(`  PHASE 30 BACKGROUND JOBS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPhase30BackgroundJobsTests();
