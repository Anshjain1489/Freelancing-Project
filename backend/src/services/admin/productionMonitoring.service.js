const supabase = require('../../config/supabase');
const config = require('../../config/env');
const logger = require('../../utils/logger');

// Local system alerts store for mock/fallback mode
const mockSystemAlerts = [];

const createSystemAlert = async ({ alertType, severity = 'WARNING', title, message, metadata = {} }) => {
  const alertRecord = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    alert_type: alertType,
    severity,
    title,
    message,
    status: 'ACTIVE',
    metadata,
    created_at: new Date().toISOString()
  };

  mockSystemAlerts.unshift(alertRecord);

  if (supabase) {
    try {
      await supabase.from('system_alerts').insert([{
        alert_type: alertType,
        severity,
        title,
        message,
        status: 'ACTIVE',
        metadata
      }]);
    } catch (e) {
      logger.warn(`[MONITORING_ALERT_WARN] Could not persist alert to database: ${e.message}`);
    }
  }

  return alertRecord;
};

const getSystemAlerts = async ({ status = 'ACTIVE', limit = 50 } = {}) => {
  if (supabase) {
    try {
      let query = supabase.from('system_alerts').select('*').order('created_at', { ascending: false }).limit(limit);
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {}
  }

  let filtered = mockSystemAlerts;
  if (status) {
    filtered = filtered.filter(a => a.status === status);
  }
  return filtered.slice(0, limit);
};

const getSystemStatusSummary = async () => {
  let dbStatus = 'healthy';
  let supabaseStatus = 'healthy';
  let configStatus = 'healthy';

  try {
    config.validateEnvironment();
  } catch (e) {
    configStatus = 'configuration_error';
  }

  try {
    if (supabase) {
      const { error } = await supabase.from('store_settings').select('key').limit(1);
      if (error) dbStatus = 'degraded';
    } else {
      dbStatus = 'operational_mock';
      supabaseStatus = 'operational_mock';
    }
  } catch (e) {
    dbStatus = 'unhealthy';
    supabaseStatus = 'unhealthy';
  }

  // Aggregate System Monitoring Metrics
  let activeAlerts = [];
  try {
    activeAlerts = await getSystemAlerts({ status: 'ACTIVE', limit: 20 });
  } catch (e) {}

  // Check Background Job Runner Status
  let jobRunnerStatus = 'OPERATIONAL';
  try {
    const jobRunner = require('../../jobs/jobRunner.service');
    if (!jobRunner.getStatus().isRunning) {
      jobRunnerStatus = 'PAUSED';
    }
  } catch (e) {}

  return {
    status: (dbStatus === 'healthy' || dbStatus === 'operational_mock') && configStatus === 'healthy' ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
    services: {
      api: { status: 'HEALTHY', uptimeSeconds: Math.floor(process.uptime()) },
      database: { status: dbStatus.toUpperCase() },
      supabase: { status: supabaseStatus.toUpperCase() },
      configuration: { status: configStatus.toUpperCase() },
      jobRunner: { status: jobRunnerStatus }
    },
    metricsSummary: {
      activeAlertsCount: activeAlerts.length,
      criticalAlertsCount: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      warningAlertsCount: activeAlerts.filter(a => a.severity === 'WARNING').length
    },
    alerts: activeAlerts
  };
};

const acknowledgeSystemAlert = async (alertId, adminId) => {
  const alert = mockSystemAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = 'ACKNOWLEDGED';
    alert.resolved_by = adminId;
  }

  if (supabase) {
    try {
      await supabase.from('system_alerts')
        .update({ status: 'ACKNOWLEDGED', resolved_by: adminId, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    } catch (e) {}
  }

  return { success: true, alertId };
};

module.exports = {
  createSystemAlert,
  getSystemAlerts,
  getSystemStatusSummary,
  acknowledgeSystemAlert,
  mockSystemAlerts
};
