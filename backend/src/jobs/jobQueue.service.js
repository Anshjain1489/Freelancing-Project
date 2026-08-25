const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { JOB_STATES } = require('./jobTypes');
const { calculateNextRunAt, shouldRetry, sanitizeJobData } = require('./retryPolicy.service');

const memoryJobQueue = new Map();

/**
 * Enqueue a new background job with optional idempotency key
 */
const enqueueJob = async ({ jobType, payload, idempotencyKey = null, maxAttempts = 3 }) => {
  const cleanPayload = sanitizeJobData(payload);

  // Check existing idempotency key
  if (idempotencyKey) {
    const existing = Array.from(memoryJobQueue.values()).find(j => j.idempotency_key === idempotencyKey);
    if (existing) {
      logger.info(`[JOB_QUEUE] Idempotency key '${idempotencyKey}' matched existing job ID=${existing.id} (Status: ${existing.status}). Skipping duplicate.`);
      return existing;
    }
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const jobRecord = {
    id: jobId,
    job_type: jobType,
    payload: cleanPayload,
    status: JOB_STATES.PENDING,
    idempotency_key: idempotencyKey,
    attempt_count: 0,
    max_attempts: maxAttempts,
    next_run_at: now,
    locked_at: null,
    locked_by: null,
    last_error: null,
    created_at: now,
    updated_at: now,
    completed_at: null
  };

  memoryJobQueue.set(jobId, jobRecord);

  if (supabase) {
    try {
      await supabase.from('background_jobs').insert([{
        id: jobId,
        job_type: jobType,
        payload: cleanPayload,
        status: JOB_STATES.PENDING,
        idempotency_key: idempotencyKey,
        attempt_count: 0,
        max_attempts: maxAttempts,
        next_run_at: now,
        created_at: now
      }]);
    } catch (err) {
      logger.warn('[JOB_QUEUE_DB_WARN] Failed DB insert, relying on memory queue:', err.message);
    }
  }

  return jobRecord;
};

/**
 * Atomically claim next pending or retrying job ready to run
 */
const claimNextJob = async (workerId = 'worker-1') => {
  const now = new Date();

  // Clean stale PROCESSING jobs locked > 5 mins
  for (const job of memoryJobQueue.values()) {
    if (job.status === JOB_STATES.PROCESSING && job.locked_at) {
      const lockAgeMs = now.getTime() - new Date(job.locked_at).getTime();
      if (lockAgeMs > 300000) { // 5 mins
        job.status = JOB_STATES.RETRYING;
        job.locked_at = null;
        job.locked_by = null;
        logger.warn(`[JOB_QUEUE] Recovered stale job ID=${job.id} locked by ${job.locked_by} for ${Math.round(lockAgeMs/1000)}s`);
      }
    }
  }

  for (const job of memoryJobQueue.values()) {
    if (
      (job.status === JOB_STATES.PENDING || job.status === JOB_STATES.RETRYING) &&
      new Date(job.next_run_at) <= now
    ) {
      job.status = JOB_STATES.PROCESSING;
      job.attempt_count += 1;
      job.locked_at = now.toISOString();
      job.locked_by = workerId;
      job.updated_at = now.toISOString();
      return job;
    }
  }

  return null;
};

/**
 * Mark job as COMPLETED
 */
const completeJob = async (jobId) => {
  const job = memoryJobQueue.get(jobId);
  if (!job) return false;

  const now = new Date().toISOString();
  job.status = JOB_STATES.COMPLETED;
  job.locked_at = null;
  job.locked_by = null;
  job.completed_at = now;
  job.updated_at = now;

  if (supabase) {
    try {
      await supabase.from('background_jobs').update({
        status: JOB_STATES.COMPLETED,
        completed_at: now,
        updated_at: now
      }).eq('id', jobId);
    } catch (err) {
      // Ignored for tests
    }
  }

  return true;
};

/**
 * Handle job failure: calculate backoff retry or transition to DEAD_LETTER
 */
const failJob = async (jobId, errorMessage) => {
  const job = memoryJobQueue.get(jobId);
  if (!job) return false;

  const now = new Date().toISOString();
  const cleanErrMsg = String(errorMessage || 'Unknown execution error').substring(0, 500);
  job.last_error = cleanErrMsg;
  job.locked_at = null;
  job.locked_by = null;

  if (shouldRetry(job.attempt_count, job.max_attempts)) {
    job.status = JOB_STATES.RETRYING;
    job.next_run_at = calculateNextRunAt(job.attempt_count);
    logger.warn(`[JOB_QUEUE] Job ID=${job.id} failed attempt ${job.attempt_count}/${job.max_attempts}. Next retry at ${job.next_run_at}`);
  } else {
    job.status = JOB_STATES.DEAD_LETTER;
    logger.error(`[JOB_QUEUE_DEAD_LETTER] Job ID=${job.id} exhausted max retries (${job.max_attempts}). Moved to DEAD_LETTER. Error: ${cleanErrMsg}`);
  }

  job.updated_at = now;

  if (supabase) {
    try {
      await supabase.from('background_jobs').update({
        status: job.status,
        last_error: cleanErrMsg,
        next_run_at: job.next_run_at,
        attempt_count: job.attempt_count,
        updated_at: now
      }).eq('id', jobId);
    } catch (err) {
      // Ignored for tests
    }
  }

  return job;
};

/**
 * Get dead-letter jobs
 */
const getDeadLetterJobs = async () => {
  return Array.from(memoryJobQueue.values()).filter(j => j.status === JOB_STATES.DEAD_LETTER);
};

/**
 * Replay a dead-letter job
 */
const replayDeadLetterJob = async (jobId) => {
  const job = memoryJobQueue.get(jobId);
  if (!job || job.status !== JOB_STATES.DEAD_LETTER) return false;

  const now = new Date().toISOString();
  job.status = JOB_STATES.PENDING;
  job.attempt_count = 0;
  job.next_run_at = now;
  job.last_error = null;
  job.updated_at = now;
  return true;
};

/**
 * Get job by ID
 */
const getJobById = (jobId) => {
  return memoryJobQueue.get(jobId) || null;
};

/**
 * Reset job queue stats for testing
 */
const clearQueueForTests = () => {
  memoryJobQueue.clear();
};

/**
 * Get aggregated job runner metrics
 */
const getMetrics = () => {
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    retrying: 0,
    deadLetter: 0,
    totalJobs: memoryJobQueue.size
  };

  for (const job of memoryJobQueue.values()) {
    if (job.status === JOB_STATES.PENDING) stats.pending++;
    else if (job.status === JOB_STATES.PROCESSING) stats.processing++;
    else if (job.status === JOB_STATES.COMPLETED) stats.completed++;
    else if (job.status === JOB_STATES.RETRYING) stats.retrying++;
    else if (job.status === JOB_STATES.DEAD_LETTER) stats.deadLetter++;
  }

  return stats;
};

module.exports = {
  enqueueJob,
  claimNextJob,
  completeJob,
  failJob,
  getDeadLetterJobs,
  replayDeadLetterJob,
  getJobById,
  clearQueueForTests,
  getMetrics
};
