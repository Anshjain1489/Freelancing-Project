const config = require('./config/environment');
const { validateStartupConfig } = require('./services/startupValidation.service');

// Run startup environment & configuration validation BEFORE loading Express application & dependencies
validateStartupConfig();

const app = require('./app');
const logger = require('./utils/logger');
const { initGracefulShutdown } = require('./services/gracefulShutdown.service');
const jobRunner = require('./jobs/jobRunner.service');

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Chaudhary Kirana Store API Server running on port ${PORT} in [${config.env}] mode`);
  logger.info(`📍 Store Location: Near Bada Jain Mandir, Tikamgarh Road, Mahruni`);
  logger.info(`🔗 Health Check: http://localhost:${PORT}/api/v1/health`);

  // Start background job worker loop
  jobRunner.start();

  // Wire graceful shutdown signal handlers
  initGracefulShutdown(server);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});
