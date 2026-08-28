const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Enforce IPv4-first DNS resolution order to resolve IPv6 ENETUNREACH in dual-stack networks
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Deterministic multi-location environment loader
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env')
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

/**
 * Safely resolves non-empty environment variable string with fallback.
 */
const getEnvStr = (key, fallback = '') => {
  const val = process.env[key];
  if (val && typeof val === 'string' && val.trim() !== '') {
    return val.trim();
  }
  return fallback;
};

const config = {
  env: getEnvStr('NODE_ENV', 'development'),
  port: parseInt(getEnvStr('PORT', '5000'), 10) || 5000,
  frontendUrl: getEnvStr('FRONTEND_URL', 'http://localhost:5173'),
  supabase: {
    url: getEnvStr('SUPABASE_URL', 'https://vuhwlckfhexlyezmfled.supabase.co'),
    anonKey: getEnvStr('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic'),
    serviceRoleKey: getEnvStr('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzI4ODE1OCwiZXhwIjoyMTAyODY0MTU4fQ.ovDLQX7wuL6o5MNKgl0IV8N_wAl1BZGA7fqPwW9bE_M')
  },
  jwt: {
    accessSecret: getEnvStr('JWT_ACCESS_SECRET', getEnvStr('JWT_SECRET', 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!')),
    refreshSecret: getEnvStr('JWT_REFRESH_SECRET', getEnvStr('JWT_SECRET', 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!')),
    issuer: getEnvStr('JWT_ISSUER', 'chaudhary-kirana-api'),
    audience: getEnvStr('JWT_AUDIENCE', 'chaudhary-kirana-clients')
  },
  google: {
    clientId: getEnvStr('GOOGLE_CLIENT_ID', ''),
    clientSecret: getEnvStr('GOOGLE_CLIENT_SECRET', '')
  },
  razorpay: {
    keyId: getEnvStr('RAZORPAY_KEY_ID', ''),
    keySecret: getEnvStr('RAZORPAY_KEY_SECRET', ''),
    webhookSecret: getEnvStr('RAZORPAY_WEBHOOK_SECRET', '')
  },
  store: {
    name: getEnvStr('STORE_NAME', 'Chaudhary Kirana Store'),
    owner: getEnvStr('STORE_OWNER', 'Akash Chaudhary'),
    phone1: getEnvStr('PRIMARY_PHONE', '7897837095'),
    phone2: getEnvStr('SECONDARY_PHONE', '7007550184'),
    address: getEnvStr('STORE_ADDRESS', 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, India'),
    latitude: parseFloat(getEnvStr('STORE_LATITUDE', '24.2381')) || 24.2381,
    longitude: parseFloat(getEnvStr('STORE_LONGITUDE', '78.7364')) || 78.7364,
    minOrderValue: parseFloat(getEnvStr('MIN_ORDER_VALUE', '199.0')) || 199.0,
    freeDeliveryRadiusKm: parseFloat(getEnvStr('FREE_DELIVERY_RADIUS_KM', '0.0')) || 0.0,
    deliveryChargePerExtraKm: parseFloat(getEnvStr('DELIVERY_CHARGE_PER_EXTRA_KM', '10.0')) || 10.0,
    maxDeliveryRadiusKm: parseFloat(getEnvStr('MAX_DELIVERY_RADIUS_KM', '15.0')) || 15.0
  },
  monitoring: {
    sentryDsn: getEnvStr('SENTRY_DSN', ''),
    logLevel: getEnvStr('LOG_LEVEL', 'info')
  },
  rateLimit: {
    windowMs: parseInt(getEnvStr('RATE_LIMIT_WINDOW_MS', '60000'), 10) || 60000,
    maxRequests: parseInt(getEnvStr('RATE_LIMIT_MAX', '100'), 10) || 100
  }
};

/**
 * Validates production environment configuration.
 * Throws descriptive Error if critical production variables are missing or insecure.
 */
function validateEnvironment(overrideEnv = null) {
  const targetEnv = overrideEnv || config.env;
  const errors = [];

  const checkRequired = (key, value) => {
    if (!value || String(value).trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  };

  const checkNotPlaceholder = (key, value, placeholders) => {
    if (value) {
      const lower = String(value).toLowerCase().trim();
      for (const ph of placeholders) {
        if (lower.includes(ph)) {
          errors.push(`Environment variable ${key} contains invalid placeholder value '${value}'`);
        }
      }
    }
  };

  checkRequired('SUPABASE_URL', config.supabase.url);
  checkRequired('SUPABASE_ANON_KEY', config.supabase.anonKey);
  checkRequired('JWT_ACCESS_SECRET', config.jwt.accessSecret);
  checkRequired('JWT_REFRESH_SECRET', config.jwt.refreshSecret);

  if (config.supabase.url && !config.supabase.url.startsWith('https://')) {
    errors.push(`SUPABASE_URL '${config.supabase.url}' must be a valid HTTPS URL`);
  }

  const placeholders = ['your_', 'change_me', 'example', '123456', 'placeholder', 'secret_key_here', 'replace-me', 'changeme', 'dev_'];
  checkNotPlaceholder('SUPABASE_ANON_KEY', config.supabase.anonKey, ['your-', 'placeholder']);
  checkNotPlaceholder('JWT_ACCESS_SECRET', config.jwt.accessSecret, placeholders);
  checkNotPlaceholder('JWT_REFRESH_SECRET', config.jwt.refreshSecret, placeholders);

  const minSecretLength = targetEnv === 'production' ? 32 : 16;
  if (config.jwt.accessSecret && config.jwt.accessSecret.length < minSecretLength) {
    errors.push(`JWT_ACCESS_SECRET must be at least ${minSecretLength} characters long (current length: ${config.jwt.accessSecret.length})`);
  }
  if (config.jwt.refreshSecret && config.jwt.refreshSecret.length < minSecretLength) {
    errors.push(`JWT_REFRESH_SECRET must be at least ${minSecretLength} characters long (current length: ${config.jwt.refreshSecret.length})`);
  }

  if (targetEnv === 'production') {
    if (config.frontendUrl && !config.frontendUrl.startsWith('https://') && !config.frontendUrl.startsWith('http://localhost')) {
      errors.push(`Production FRONTEND_URL '${config.frontendUrl}' must use HTTPS protocol`);
    }
  }

  if (errors.length > 0) {
    const errorMsg = `[ENVIRONMENT_CONFIGURATION_ERROR]\n${errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMsg);
  }

  return true;
}

config.validateEnvironment = validateEnvironment;

module.exports = config;
