const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/environment');
const supabase = require('../config/supabase');
const sseManager = require('../notifications/sse.manager');
const performanceMetrics = require('../services/performanceMetrics.service');
const { getCacheProvider } = require('../infrastructure/cache/cacheProvider');
const { getRateLimitStore } = require('../infrastructure/rateLimit/rateLimitStore');
const { getEventBus } = require('../infrastructure/events/eventBus');
const jobRunner = require('../jobs/jobRunner.service');
const gracefulShutdown = require('../services/gracefulShutdown.service');

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
 * Protected metrics: Operational State (ACTIVE/DRAINING), DB, Cache provider, Rate limit store, Event bus, Job runner, Performance metrics, SSE.
 */
const getHealthReadiness = asyncHandler(async (req, res) => {
  const operationalState = gracefulShutdown.getState();

  if (gracefulShutdown.isDraining()) {
    return res.status(503).json({
      status: 'unavailable',
      operationalState,
      message: 'Server is currently shutting down (DRAINING). Please retry request on another healthy backend instance.',
      timestamp: new Date().toISOString()
    });
  }

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
  const sseStats = sseManager ? sseManager.getStats() : { activeUsers: 0, activeConnections: 0 };
  const perfMetrics = performanceMetrics.getMetrics();
  const cacheStats = await getCacheProvider().healthCheck();
  const rateLimitStats = await getRateLimitStore().healthCheck();
  const eventBusStats = await getEventBus().healthCheck();
  const jobRunnerStats = jobRunner.getStatus();

  res.status(200).json({
    status: 'ok',
    operationalState,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    cache: cacheStats,
    rateLimitStore: rateLimitStats,
    eventBus: eventBusStats,
    jobs: jobRunnerStats,
    memory: {
      rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024))
    },
    sseStreams: sseStats,
    performance: {
      totalRequests: perfMetrics.totalRequests,
      slowRequests: perfMetrics.slowRequests,
      averageLatencyMs: perfMetrics.averageLatencyMs,
      maxLatencyMs: perfMetrics.maxLatencyMs,
      p95LatencyMs: perfMetrics.p95LatencyMs,
      p99LatencyMs: perfMetrics.p99LatencyMs
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

module.exports = { getHealthStatus, getHealthReadiness };
