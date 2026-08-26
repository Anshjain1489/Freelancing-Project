const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logSecurityEvent, SECURITY_EVENTS } = require('../services/securityAudit.service');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    code: ERROR_CODES.RATE_LIMIT_EXCEEDED
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent(SECURITY_EVENTS.AUTH_LOGIN_FAILED, {
      req,
      details: { reason: 'Login rate limit exceeded' },
      severity: 'WARNING'
    });
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many login attempts. Please wait 15 minutes before trying again.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Account creation limit reached from this IP. Please try again in an hour.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many password reset requests. Please try again later.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const otpVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 API verification attempts per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anon_ip';
    const userId = req.user?.id || 'anon_user';
    const orderId = req.params?.id || req.body?.orderId || 'anon_order';
    return `otp_limit:${ip}:${userId}:${orderId}`;
  },
  handler: (req, res) => {
    logSecurityEvent(SECURITY_EVENTS.OTP_RATE_LIMIT_EXCEEDED, {
      req,
      orderId: req.params?.id || req.body?.orderId || null,
      details: { reason: 'OTP verification rate limit exceeded' },
      severity: 'WARNING'
    });
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many OTP verification attempts. Please wait 10 minutes before retrying.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many payment verification attempts, please slow down.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anon_ip';
    const userId = req.user?.id || 'anon_user';
    return `order_limit:${ip}:${userId}`;
  },
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Order creation limit exceeded. Please wait 10 minutes before placing more orders.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

const deliveryActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anon_ip';
    const userId = req.user?.id || 'anon_user';
    return `delivery_action_limit:${ip}:${userId}`;
  },
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many delivery management actions in a short period.',
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      requestId: req.id
    });
  }
});

module.exports = {
  generalLimiter,
  apiLimiter: generalLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpVerificationLimiter,
  paymentLimiter,
  orderCreationLimiter,
  deliveryActionLimiter
};
