const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit login/register attempts to 20 per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED
  }
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit payment verification calls to 30 per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment verification attempts, please slow down.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED
  }
});

module.exports = { generalLimiter, authLimiter, paymentLimiter };
