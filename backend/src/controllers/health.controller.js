const supabase = require('../config/supabase');
const config = require('../config/env');

let cachedDbStatus = { status: 'healthy', timestamp: 0 };

/**
 * 1. GET /health / getHealthStatus
 * Consolidated safe health endpoint compatible with Phase 32 and Phase 43.
 */
const getHealth = async (req, res) => {
  let dbStatus = 'healthy';
  let supabaseStatus = 'healthy';

  const now = Date.now();
  if (now - cachedDbStatus.timestamp < 2000) {
    dbStatus = cachedDbStatus.status;
    supabaseStatus = cachedDbStatus.status;
  } else {
    try {
      if (supabase) {
        const { error } = await supabase.from('store_settings').select('key').limit(1);
        if (error) {
          dbStatus = 'degraded';
          supabaseStatus = 'degraded';
        }
      } else {
        dbStatus = 'operational_mock';
        supabaseStatus = 'operational_mock';
      }
    } catch (e) {
      dbStatus = 'unhealthy';
      supabaseStatus = 'unhealthy';
    }
    cachedDbStatus = { status: dbStatus, timestamp: now };
  }

  const isHealthy = dbStatus === 'healthy' || dbStatus === 'operational_mock';
  const statusCode = isHealthy ? 200 : 503;

  const payload = {
    status: 'ok',
    service: 'Chaudhary Kirana Store API',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: dbStatus,
      supabase: supabaseStatus
    }
  };

  if (res && typeof res.status === 'function') {
    return res.status(statusCode).json(payload);
  }
  return payload;
};

/**
 * 2. GET /health/live
 * Process liveness check. Does NOT require database connection.
 */
const getLiveness = (req, res) => {
  const payload = {
    status: 'alive',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  };
  if (res && typeof res.status === 'function') {
    return res.status(200).json(payload);
  }
  return payload;
};

/**
 * 3. GET /health/ready
 * Readiness probe for traffic routing (Load Balancer / Cloud Run).
 */
const getReadiness = async (req, res) => {
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
      if (error) {
        dbStatus = 'unhealthy';
        supabaseStatus = 'unhealthy';
      }
    } else {
      dbStatus = 'operational_mock';
      supabaseStatus = 'operational_mock';
    }
  } catch (e) {
    dbStatus = 'unhealthy';
    supabaseStatus = 'unhealthy';
  }

  const isReady = (dbStatus === 'healthy' || dbStatus === 'operational_mock') && configStatus === 'healthy';
  const statusCode = isReady ? 200 : 503;

  const payload = {
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      database: dbStatus,
      supabase: supabaseStatus,
      configuration: configStatus
    },
    timestamp: new Date().toISOString()
  };

  if (res && typeof res.status === 'function') {
    return res.status(200).json(payload);
  }
  return payload;
};

/**
 * 4. GET /health/version
 * Release build & version diagnostic info.
 */
const getVersion = (req, res) => {
  const payload = {
    version: '1.0.0',
    service: 'chaudhary-kirana-api',
    environment: config.env,
    commit: process.env.GIT_COMMIT_SHA || 'production-release-v1.0.0',
    buildTimestamp: '2026-08-30T00:00:00Z',
    status: 'healthy'
  };
  if (res && typeof res.status === 'function') {
    return res.status(200).json(payload);
  }
  return payload;
};

module.exports = {
  getHealth,
  getHealthStatus: getHealth,
  getLiveness,
  getReadiness,
  getVersion
};
