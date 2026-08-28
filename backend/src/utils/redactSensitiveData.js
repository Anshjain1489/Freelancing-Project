/**
 * Recursive sensitive data redaction utility.
 * Sanitizes passwords, JWT tokens, API secrets, card details, bank details, and authorization headers before logging.
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
  'razorpay_secret',
  'razorpay_key_secret',
  'webhook_secret',
  'provider_signature',
  'signature',
  'bank_details',
  'account_number',
  'account_no',
  'ifsc_code',
  'card_number',
  'cardnumber',
  'cvv',
  'cvc',
  'otp',
  'otp_hash'
]);

function redactValue(key, val) {
  if (val === null || val === undefined) return val;
  const lowerKey = String(key).toLowerCase().replace(/[-_]/g, '');

  for (const sKey of SENSITIVE_KEYS) {
    if (lowerKey === sKey.replace(/[-_]/g, '') || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
      return '[REDACTED]';
    }
  }
  return val;
}

function redactSensitiveData(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact bearer tokens or inline query string parameters
    if (obj.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    return obj.replace(/([?&](?:token|password|secret|key|access_token)=)[^&]+/gi, '$1[REDACTED]');
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
    const errorObj = {
      name: obj.name,
      message: redactSensitiveData(obj.message, seen),
      stack: redactSensitiveData(obj.stack, seen)
    };
    return errorObj;
  }

  const redacted = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const lowerKey = String(key).toLowerCase();
    
    let isSensitive = false;
    for (const sKey of SENSITIVE_KEYS) {
      if (lowerKey === sKey || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        isSensitive = true;
        break;
      }
    }

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactSensitiveData(val, seen);
    }
  }

  return redacted;
}

module.exports = {
  redactSensitiveData,
  SENSITIVE_KEYS
};
