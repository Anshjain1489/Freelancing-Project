const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

/**
 * Production Security Middleware Suite
 * Includes configurable rate limiters for auth, admin, public, and webhook routes,
 * security header policies, and payload size safeguards.
 */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login/register attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 admin operations per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TOO_MANY_REQUESTS',
    message: 'Admin API request threshold exceeded. Please slow down.'
  }
});

const publicLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests * 2, // Generous limit for storefront browsing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded. Please try again shortly.'
  }
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Allow high throughput for valid Razorpay/WhatsApp webhooks
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'TOO_MANY_REQUESTS',
    message: 'Webhook delivery threshold exceeded.'
  }
});

/**
 * Configure Helmet security headers suitable for production & Razorpay/Supabase integrations.
 */
const helmetSecurityOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://maps.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://vuhwlckfhexlyezmfled.supabase.co", "https://*.google.com", "https://*.googleapis.com"],
      connectSrc: ["'self'", "https://vuhwlckfhexlyezmfled.supabase.co", "https://api.razorpay.com", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: config.env === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false
};

module.exports = {
  authLimiter,
  adminLimiter,
  publicLimiter,
  webhookLimiter,
  helmetSecurityOptions
};
