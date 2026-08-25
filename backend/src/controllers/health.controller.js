const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/environment');
const supabase = require('../config/supabase');
const sseManager = require('../notifications/sse.manager');

/**
 * 1. Minimal Public Liveness (GET /api/v1/health)
 * Never exposes secrets, internal hostnames, stack traces, or environment variables.
 */
const getHealthStatus = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * 2. Internal Readiness & System Diagnostics (GET /api/v1/health/ready)
 * Protected metrics: DB connectivity & latency, Memory footprint, SSE streams.
 */
const getHealthReadiness = asyncHandler(async (req, res) => {
  let dbStatus = 'disconnected_local_mock';
  let dbLatencyMs = null;

  if (supabase) {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('categories').select('id').limit(1);
      dbLatencyMs = Date.now() - startTime;
      dbStatus = error ? 'connection_error' : 'connected_supabase_postgresql';
    } catch {
      dbStatus = 'connection_error';
    }
  }

  const memoryUsage = process.memoryUsage();
  const sseStats = sseManager ? sseManager.getStats() : { activeUsersCount: 0, totalConnectionsCount: 0 };

  res.status(200).json({
    success: true,
    message: 'Chaudhary Kirana Store System Readiness Diagnostics',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    memory: {
      rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024))
    },
    sseStreams: sseStats,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

module.exports = { getHealthStatus, getHealthReadiness };
