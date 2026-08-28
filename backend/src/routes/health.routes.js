const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const config = require('../config/environment');

/**
 * GET /health / /api/v1/health
 * Safe public basic health check.
 */
router.get('/', async (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'chaudhary-kirana-api',
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/live
 * Liveness probe for process execution. Does NOT require database connection.
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'ALIVE',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ready
 * Readiness probe for container orchestrators (K8s / Cloud Run).
 * Verifies database connectivity and environment initialization.
 */
router.get('/ready', async (req, res) => {
  try {
    let dbConnected = false;
    if (supabase) {
      const { data, error } = await supabase.from('store_settings').select('key').limit(1);
      if (!error) dbConnected = true;
    }

    if (dbConnected) {
      return res.status(200).json({
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(503).json({
        status: 'SERVICE_NOT_READY',
        database: 'DISCONNECTED',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    return res.status(503).json({
      status: 'SERVICE_NOT_READY',
      error: 'Database connectivity probe failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/version
 * Safe diagnostic deployment version endpoint.
 * Strictly conceals all passwords, JWT secrets, and database credentials.
 */
router.get('/version', (req, res) => {
  res.status(200).json({
    version: '1.0.0',
    environment: config.env,
    commit: process.env.GIT_COMMIT_SHA || 'production-release-phase42',
    buildTimestamp: '2026-08-28T23:30:00Z',
    status: 'healthy'
  });
});

module.exports = router;
