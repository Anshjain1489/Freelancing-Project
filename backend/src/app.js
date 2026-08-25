const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const corsOptions = require('./config/cors');
const requestIdMiddleware = require('./middleware/requestId.middleware');
const performanceMiddleware = require('./middleware/performance.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { notFound } = require('./middleware/error.middleware');
const errorMonitoringMiddleware = require('./middleware/errorMonitoring.middleware');
const apiRoutes = require('./routes');

const app = express();

// Request ID assignment for correlation tracing
app.use(requestIdMiddleware);

// Performance latency monitoring & X-Response-Time header
app.use(performanceMiddleware);

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP Request Logging (Sanitize sensitive tokens in query params and include requestId)
morgan.token('clean-url', (req) => {
  const url = req.originalUrl || req.url || '';
  return url.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
});
morgan.token('req-id', (req) => req.id || '-');

app.use(morgan('[:req-id] :method :clean-url :status :response-time ms - :res[content-length]'));

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

// Base API Routes V1
app.use('/api/v1', apiRoutes);

// Root Health Fallback
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Welcome to Chaudhary Kirana Store API Server',
    healthCheck: '/api/v1/health'
  });
});

// 404 & Global Error Handling
app.use(notFound);
app.use(errorMonitoringMiddleware);

module.exports = app;
