const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const corsOptions = require('./config/cors');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP Request Logging (Sanitize sensitive tokens in query params)
morgan.token('clean-url', (req) => {
  const url = req.originalUrl || req.url || '';
  return url.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
});

app.use(morgan(':method :clean-url :status :response-time ms - :res[content-length]'));

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
    success: true,
    message: 'Welcome to Chaudhary Kirana Store API Server',
    healthCheck: '/api/v1/health'
  });
});

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
