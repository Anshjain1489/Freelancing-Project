const logger = require('../utils/logger');
const { JOB_TYPES } = require('./jobTypes');
const jobQueue = require('./jobQueue.service');

const handlers = new Map();
let isRunning = false;
let timerId = null;
let activeWorkersCount = 0;

// Register default no-op/mock handlers
handlers.set(JOB_TYPES.ORDER_NOTIFICATION, async (payload) => {
  logger.info('[JOB_HANDLER] Processing ORDER_NOTIFICATION for orderId:', payload?.orderId);
  return { success: true };
});

handlers.set(JOB_TYPES.PAYMENT_RECONCILIATION, async (payload) => {
  logger.info('[JOB_HANDLER] Processing PAYMENT_RECONCILIATION for orderId:', payload?.orderId);
  return { success: true };
});

handlers.set(JOB_TYPES.DELIVERY_NOTIFICATION, async (payload) => {
  logger.info('[JOB_HANDLER] Processing DELIVERY_NOTIFICATION for deliveryId:', payload?.deliveryId);
  return { success: true };
});

handlers.set(JOB_TYPES.CACHE_INVALIDATION, async (payload) => {
  logger.info('[JOB_HANDLER] Processing CACHE_INVALIDATION for prefix:', payload?.prefix);
  return { success: true };
});

handlers.set(JOB_TYPES.ANALYTICS_REFRESH, async (payload) => {
  logger.info('[JOB_HANDLER] Processing ANALYTICS_REFRESH');
  return { success: true };
});

const registerHandler = (jobType, handlerFn) => {
  if (typeof handlerFn === 'function') {
    handlers.set(jobType, handlerFn);
  }
};

const processNextJob = async (force = true) => {
  if (!isRunning && !force) return;

  try {
    const job = await jobQueue.claimNextJob(`worker-${process.pid}`);
    if (!job) return;

    activeWorkersCount++;
    const handler = handlers.get(job.job_type);

    if (!handler) {
      logger.warn(`[JOB_RUNNER] No registered handler for job_type='${job.job_type}'. Failing job ID=${job.id}`);
      await jobQueue.failJob(job.id, `No handler registered for ${job.job_type}`);
      activeWorkersCount--;
      return;
    }

    try {
      await handler(job.payload);
      await jobQueue.completeJob(job.id);
    } catch (err) {
      await jobQueue.failJob(job.id, err.message);
    } finally {
      activeWorkersCount--;
    }
  } catch (err) {
    logger.error('[JOB_RUNNER_ERROR]', err);
  }
};

const start = (pollIntervalMs = 1000) => {
  if (isRunning) return;
  isRunning = true;
  logger.info(`[JOB_RUNNER] Background Job Runner started with interval ${pollIntervalMs}ms`);
  
  timerId = setInterval(() => {
    processNextJob();
  }, pollIntervalMs);
};

const stop = async (timeoutMs = 5000) => {
  if (!isRunning) return;
  isRunning = false;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  logger.info('[JOB_RUNNER] Stopping Job Runner... Waiting for active workers to complete.');

  const startWait = Date.now();
  while (activeWorkersCount > 0 && Date.now() - startWait < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }

  logger.info('[JOB_RUNNER] Job Runner stopped successfully.');
};

const getStatus = () => {
  return {
    isRunning,
    activeWorkersCount,
    ...jobQueue.getMetrics()
  };
};

module.exports = {
  start,
  stop,
  registerHandler,
  processNextJob,
  getStatus
};
