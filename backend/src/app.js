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

// HTTP Request Logging
app.use(morgan('dev'));

// Rate Limiting for General Requests
app.use('/api', generalLimiter);

// JSON and URL-Encoded Body Parsers
app.use(express.json({ limit: '10mb' }));
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
