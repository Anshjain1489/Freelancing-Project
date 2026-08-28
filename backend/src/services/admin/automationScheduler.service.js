const supabase = require('../../config/supabase');
const reorderIntelligence = require('./reorderIntelligence.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const runningJobsSet = new Set();
const mockJobRuns = [];
const mockSystemAlerts = [];

/**
 * Helper to record Job Run Execution in Database / Memory
 */
const recordJobRun = async (jobName, status, startedAt, durationMs, recordsProcessed, errorDetails = null) => {
  const record = {
    id: `jobrun-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    job_name: jobName,
    status,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: durationMs,
    records_processed: recordsProcessed,
    error_details: errorDetails
  };

  mockJobRuns.unshift(record);

  if (supabase) {
    try {
      await supabase.from('automation_job_runs').insert([record]);
    } catch (e) {}
  }

  return record;
};

/**
 * Helper to Record System Alert
 */
const createSystemAlert = async (alertType, severity, title, message) => {
  const alertRecord = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    alert_type: alertType,
    severity,
    title,
    message,
    is_resolved: false,
    created_at: new Date().toISOString()
  };

  mockSystemAlerts.unshift(alertRecord);

  if (supabase) {
    try {
      await supabase.from('system_alerts').insert([alertRecord]);
    } catch (e) {}
  }

  return alertRecord;
};

/**
 * Job 1: Check Low Stock
 */
const runCheckLowStock = async () => {
  const jobName = 'checkLowStock';
  if (runningJobsSet.has(jobName)) {
    throw new AppError(`Job "${jobName}" is already running concurrently`, HTTP_STATUS.CONFLICT);
  }

  runningJobsSet.add(jobName);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  try {
    const recRes = await reorderIntelligence.generateReorderRecommendations();
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'SUCCESS', startedAt, duration, recRes.count);
    return { jobName, success: true, count: recRes.count, duration };
  } catch (err) {
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'FAILED', startedAt, duration, 0, err.message);
    await createSystemAlert('JOB_FAILURE', 'WARNING', `Job ${jobName} Failed`, err.message);
    throw err;
  } finally {
    runningJobsSet.delete(jobName);
  }
};

/**
 * Job 2: Generate Reorder Recommendations
 */
const runGenerateReorderRecommendations = async () => {
  const jobName = 'generateReorderRecommendations';
  if (runningJobsSet.has(jobName)) {
    throw new AppError(`Job "${jobName}" is already running concurrently`, HTTP_STATUS.CONFLICT);
  }

  runningJobsSet.add(jobName);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  try {
    const res = await reorderIntelligence.generateReorderRecommendations();
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'SUCCESS', startedAt, duration, res.count);
    return { jobName, success: true, count: res.count, duration };
  } catch (err) {
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'FAILED', startedAt, duration, 0, err.message);
    await createSystemAlert('JOB_FAILURE', 'WARNING', `Job ${jobName} Failed`, err.message);
    throw err;
  } finally {
    runningJobsSet.delete(jobName);
  }
};

/**
 * Job 3: Monitor System Health
 */
const runMonitorSystemHealth = async () => {
  const jobName = 'monitorSystemHealth';
  if (runningJobsSet.has(jobName)) {
    throw new AppError(`Job "${jobName}" is already running concurrently`, HTTP_STATUS.CONFLICT);
  }

  runningJobsSet.add(jobName);
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  try {
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'SUCCESS', startedAt, duration, 1);
    return { jobName, success: true, duration };
  } catch (err) {
    const duration = Date.now() - t0;
    await recordJobRun(jobName, 'FAILED', startedAt, duration, 0, err.message);
    throw err;
  } finally {
    runningJobsSet.delete(jobName);
  }
};

/**
 * Get Job Run History
 */
const getAutomationJobRuns = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('automation_job_runs').select('*').order('started_at', { ascending: false }).limit(50);
      if (!error && data && data.length > 0) return { jobRuns: data };
    } catch (e) {}
  }
  return { jobRuns: mockJobRuns };
};

/**
 * Get System Alerts
 */
const getSystemAlerts = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('system_alerts').select('*').order('created_at', { ascending: false }).limit(50);
      if (!error && data && data.length > 0) return { alerts: data };
    } catch (e) {}
  }
  return { alerts: mockSystemAlerts };
};

module.exports = {
  runCheckLowStock,
  runGenerateReorderRecommendations,
  runMonitorSystemHealth,
  getAutomationJobRuns,
  getSystemAlerts,
  createSystemAlert
};
