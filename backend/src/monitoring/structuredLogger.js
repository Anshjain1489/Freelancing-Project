const crypto = require('crypto');

// List of sensitive key patterns to redact recursively
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'authorization',
  'cookie',
  'secret',
  'jwt_secret',
  'otp_encryption_key',
  'otp',
  'rawotp',
  'delivery_otp_hash',
  'deliveryotphash',
  'delivery_otp_encrypted',
  'deliveryotpencrypted',
  'provider_signature',
  'providersignature',
  'razorpaysecret',
  'razorpay_key_secret',
  'card',
  'cardnumber',
  'cvv'
];

/**
 * Deeply redact sensitive fields from an object without mutating original input
 */
function redactSensitiveData(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj !== 'object') {
    return obj;
  }

  // Prevent circular references
  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }

  if (Array.isArray(obj)) {
    seen.add(obj);
    return obj.map(item => redactSensitiveData(item, seen));
  }

  // Handle Buffer
  if (Buffer.isBuffer(obj)) {
    return '[BUFFER]';
  }

  // Handle Error instances
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    };
  }

  seen.add(obj);
  const copy = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(pattern => lowerKey === pattern || lowerKey.includes(pattern));

    if (isSensitive) {
      copy[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      copy[key] = redactSensitiveData(obj[key], seen);
    } else {
      copy[key] = obj[key];
    }
  }

  return copy;
}

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50
};

class StructuredLogger {
  constructor() {
    this.minLevel = process.env.LOG_LEVEL ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || 20) : 20;
    this.silentInTests = process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_LOGS !== 'true';
  }

  formatLog(levelStr, message, context = {}) {
    const sanitizedContext = redactSensitiveData(context);
    const entry = {
      timestamp: new Date().toISOString(),
      level: levelStr,
      message: String(message),
      ...sanitizedContext
    };
    return JSON.stringify(entry);
  }

  log(levelStr, message, context = {}) {
    const levelVal = LOG_LEVELS[levelStr] || 20;
    if (levelVal < this.minLevel) return null;

    const formatted = this.formatLog(levelStr, message, context);
    if (!this.silentInTests) {
      if (levelVal >= 40) {
        console.error(formatted);
      } else if (levelVal === 30) {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }
    return formatted;
  }

  debug(message, context = {}) {
    return this.log('DEBUG', message, context);
  }

  info(message, context = {}) {
    return this.log('INFO', message, context);
  }

  warn(message, context = {}) {
    return this.log('WARN', message, context);
  }

  error(message, context = {}) {
    return this.log('ERROR', message, context);
  }

  fatal(message, context = {}) {
    return this.log('FATAL', message, context);
  }

  redact(data) {
    return redactSensitiveData(data);
  }
}

const structuredLogger = new StructuredLogger();
module.exports = structuredLogger;
module.exports.redactSensitiveData = redactSensitiveData;
