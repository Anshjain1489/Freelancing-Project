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

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  jwt: {
    accessSecret: (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!')).trim(),
    refreshSecret: (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!')).trim(),
    issuer: process.env.JWT_ISSUER || 'chaudhary-kirana-api',
    audience: process.env.JWT_AUDIENCE || 'chaudhary-kirana-clients'
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ''
  },
  store: {
    name: process.env.STORE_NAME || 'Chaudhary Kirana Store',
    owner: process.env.STORE_OWNER || 'Akash Chaudhary',
    phone1: process.env.PRIMARY_PHONE || '7897837095',
    phone2: process.env.SECONDARY_PHONE || '7007550184',
    address: process.env.STORE_ADDRESS || 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, India',
    latitude: parseFloat(process.env.STORE_LATITUDE) || 24.2381,
    longitude: parseFloat(process.env.STORE_LONGITUDE) || 78.7364,
    minOrderValue: parseFloat(process.env.MIN_ORDER_VALUE) || 199.0,
    freeDeliveryRadiusKm: parseFloat(process.env.FREE_DELIVERY_RADIUS_KM) || 0.0,
    deliveryChargePerExtraKm: parseFloat(process.env.DELIVERY_CHARGE_PER_EXTRA_KM) || 10.0,
    maxDeliveryRadiusKm: parseFloat(process.env.MAX_DELIVERY_RADIUS_KM) || 15.0
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
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
