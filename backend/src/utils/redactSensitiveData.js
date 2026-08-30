/**
 * Comprehensive Sensitive Data Redaction Utility for Chaudhary Kirana Store
 * Sanitizes passwords, JWTs, API keys, Supabase service keys, DB credentials, Razorpay secrets,
 * card details, bank account numbers, and authorization headers before logging.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'old_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'jwt',
  'secret',
  'api_key',
  'apikey',
  'service_role_key',
  'servicerolekey',
  'supabase_service_role_key',
  'supabase_anon_key',
  'razorpay_secret',
  'razorpay_key_secret',
  'webhook_secret',
  'provider_signature',
  'signature',
  'bank_details',
  'bank_account_number',
  'bank_account_no',
  'account_number',
  'account_no',
  'ifsc_code',
  'card_number',
  'cardnumber',
  'cvv',
  'cvc',
  'otp',
  'otp_hash',
  'database_url',
  'db_password',
  'cookie',
  'cookies'
]);

/**
 * Redact sensitive strings using regex pattern matching
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return str;

  let sanitized = str;

  // Redact Bearer tokens
  sanitized = sanitized.replace(/(bearer\s+)[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*/gi, '$1[REDACTED]');
  sanitized = sanitized.replace(/(bearer\s+)[^\s"']+/gi, '$1[REDACTED]');

  // Redact PostgreSQL connection strings (e.g. postgresql://user:pass@host)
  sanitized = sanitized.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.+)/gi, '$1[REDACTED]$2');

  // Redact inline query parameters
  sanitized = sanitized.replace(/([?&](?:token|password|secret|key|access_token|refresh_token|service_role_key)=)[^&]+/gi, '$1[REDACTED]');

  // Redact JWT tokens (eyJ...)
  sanitized = sanitized.replace(/eyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+/g, '[REDACTED_JWT]');

  return sanitized;
}

function redactSensitiveData(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, seen));
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: sanitizeString(obj.stack)
    };
  }

  const redacted = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const lowerKey = String(key).toLowerCase().replace(/[-_]/g, '');

    let isSensitive = false;
    for (const sKey of SENSITIVE_KEYS) {
      const cleanSKey = sKey.replace(/[-_]/g, '');
      if (
        lowerKey === cleanSKey ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('jwt') ||
        lowerKey.includes('bank') ||
        lowerKey.includes('account') ||
        lowerKey.includes('card') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('otp')
      ) {
        isSensitive = true;
        break;
      }
    }

    if (isSensitive) {
      if (typeof val === 'string' && val.toLowerCase().startsWith('bearer ')) {
        redacted[key] = 'Bearer [REDACTED]';
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else {
      redacted[key] = redactSensitiveData(val, seen);
    }
  }

  return redacted;
}

module.exports = {
  redactSensitiveData,
  sanitizeString,
  SENSITIVE_KEYS
};
