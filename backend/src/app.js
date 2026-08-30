const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const corsOptions = require('./config/cors');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const storeContextMiddleware = require('./middleware/storeContext.middleware');
const performanceMiddleware = require('./middleware/performance.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { helmetSecurityOptions } = require('./middleware/productionSecurity.middleware');
const { notFound } = require('./middleware/error.middleware');
const errorMonitoringMiddleware = require('./middleware/errorMonitoring.middleware');
const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes');
const { redactSensitiveData } = require('./utils/redactSensitiveData');
const { shutdownMiddleware } = require('./services/gracefulShutdown.service');

const app = express();

// Request ID assignment for correlation tracing
app.use(requestIdMiddleware);

// Server-authoritative store context
app.use(storeContextMiddleware);

// Graceful shutdown DRAINING request rejection middleware
app.use(shutdownMiddleware);

// Performance latency monitoring & X-Response-Time header
app.use(performanceMiddleware);

// Security Headers (Helmet + Content Security Policy)
app.use(helmet(helmetSecurityOptions));

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP Request Logging (Sanitize sensitive tokens in query params and include requestId)
morgan.token('clean-url', (req) => {
  const url = req.originalUrl || req.url || '';
  return redactSensitiveData(url);
});
morgan.token('req-id', (req) => req.id || req.requestId || '-');

app.use(morgan('[:req-id] :method :clean-url :status :response-time ms - :res[content-length]'));

// Direct Top-Level Health Routes (/health, /health/live, /health/ready, /health/version)
app.use('/health', healthRoutes);

// Rate Limiting for General Requests
app.use('/api', generalLimiter);

// JSON and URL-Encoded Body Parsers (Capture rawBody for webhook HMAC verification)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Base API Routes V1 & /api compatibility mount
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// Root Health Fallback
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chaudhary Kirana Store API Server',
    healthCheck: '/health'
  });
});

// 404 & Global Error Handling
app.use(notFound);
app.use(errorMonitoringMiddleware);

module.exports = app;
