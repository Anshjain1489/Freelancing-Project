const supabase = require('../config/supabase');

const SECURITY_EVENTS = {
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  OTP_ACCESS_DENIED: 'OTP_ACCESS_DENIED',
  OTP_VERIFICATION_FAILED: 'OTP_VERIFICATION_FAILED',
  OTP_RATE_LIMIT_EXCEEDED: 'OTP_RATE_LIMIT_EXCEEDED',
  PAYMENT_SIGNATURE_MISMATCH: 'PAYMENT_SIGNATURE_MISMATCH',
  ADMIN_STATUS_OVERRIDE: 'ADMIN_STATUS_OVERRIDE',
  DELIVERY_ASSIGNMENT_REVOKED: 'DELIVERY_ASSIGNMENT_REVOKED',
  UNAUTHORIZED_RESOURCE_ACCESS: 'UNAUTHORIZED_RESOURCE_ACCESS'
};

const SENSITIVE_KEYS = ['password', 'otp', 'token', 'jwt', 'secret', 'signature', 'authorization', 'cookie', 'cvv'];

const redactSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactSensitiveData);

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const logSecurityEvent = async (eventType, { userId = null, orderId = null, ip = null, req = null, details = {}, severity = 'INFO' }) => {
  const requestId = req?.id || req?.headers?.['x-request-id'] || null;
  const clientIp = ip || req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown';

  const entry = {
    timestamp: new Date().toISOString(),
    requestId,
    eventType,
    userId: userId || req?.user?.id || null,
    orderId,
    ip: clientIp,
    severity,
    details: redactSensitiveData(details)
  };

  console.log(`[SECURITY_AUDIT] ${JSON.stringify(entry)}`);

  if (supabase) {
    try {
      await supabase.from('audit_logs').insert([{
        user_id: entry.userId,
        action: eventType,
        entity_type: orderId ? 'order' : 'security',
        entity_id: orderId || entry.userId,
        details: entry.details,
        ip_address: clientIp,
        created_at: entry.timestamp
      }]);
    } catch (err) {
      // Table may be optional or offline
    }
  }

  return entry;
};

module.exports = {
  SECURITY_EVENTS,
  logSecurityEvent,
  redactSensitiveData
};
