const logger = require('../utils/logger');
const sseManager = require('../notifications/sse.manager');
const jobRunner = require('../jobs/jobRunner.service');

const STATES = {
  ACTIVE: 'ACTIVE',
  DRAINING: 'DRAINING',
  STOPPED: 'STOPPED'
};

let currentState = STATES.ACTIVE;
let httpServer = null;
let activeRequestsCount = 0;

/**
 * Express middleware to track in-flight active requests and block new requests during DRAINING
 */
const shutdownMiddleware = (req, res, next) => {
  if (currentState === STATES.DRAINING) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({
      success: false,
      statusCode: 503,
      message: 'Server is currently shutting down (DRAINING). Please retry request.',
      operationalState: currentState
    });
  }

  activeRequestsCount++;
  res.on('finish', () => {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  });
  res.on('close', () => {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  });

  next();
};

/**
 * Trigger graceful shutdown workflow
 */
const triggerShutdown = async (signal = 'SIGTERM', exitProcess = false) => {
  if (currentState !== STATES.ACTIVE) {
    logger.warn(`[SHUTDOWN] Graceful shutdown already in progress (${currentState}). Ignoring duplicate signal ${signal}.`);
    return;
  }

  currentState = STATES.DRAINING;
  logger.info(`[SHUTDOWN] Received ${signal}. Initiating graceful shutdown. Application state: DRAINING.`);

  const timeoutMs = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 1000;

  try {
    // 1. Stop background job processing
    await jobRunner.stop(100);

    // 2. Broadcast SSE shutdown notice and close client connections
    if (typeof sseManager.shutdown === 'function') {
      sseManager.shutdown();
    }

    // 3. Allow active in-flight HTTP requests to drain
    const startWait = Date.now();
    while (activeRequestsCount > 0 && Date.now() - startWait < timeoutMs) {
      logger.info(`[SHUTDOWN] Waiting for ${activeRequestsCount} active HTTP requests to drain...`);
      await new Promise((r) => setTimeout(r, 200));
    }

    // 4. Close HTTP Server
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close(() => {
          logger.info('[SHUTDOWN] HTTP Server closed cleanly.');
          resolve();
        });
      });
    }

    currentState = STATES.STOPPED;
    logger.info('[SHUTDOWN_COMPLETE] Application graceful shutdown finished cleanly.');

    if (exitProcess) {
      process.exit(0);
    }
  } catch (err) {
    logger.error('[SHUTDOWN_ERROR] Error during graceful shutdown:', err);
    if (exitProcess) {
      process.exit(1);
    }
  }
};

/**
 * Initialize SIGTERM / SIGINT signal handlers
 */
const initGracefulShutdown = (server) => {
  httpServer = server;

  process.on('SIGTERM', () => triggerShutdown('SIGTERM', true));
  process.on('SIGINT', () => triggerShutdown('SIGINT', true));
};

const getState = () => currentState;
const isDraining = () => currentState === STATES.DRAINING;
const resetStateForTests = () => {
  currentState = STATES.ACTIVE;
  activeRequestsCount = 0;
  httpServer = null;
};

module.exports = {
  initGracefulShutdown,
  shutdownMiddleware,
  triggerShutdown,
  getState,
  isDraining,
  resetStateForTests
};
