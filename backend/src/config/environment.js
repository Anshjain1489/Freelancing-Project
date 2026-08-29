const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Enforce IPv4-first DNS resolution order to resolve IPv6 ENETUNREACH in dual-stack networks
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Multi-location local environment loader (loads .env if present on disk)
const possibleEnvPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
  path.join(__dirname, '../../../backend/.env')
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
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
    accessSecret: (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '').trim(),
    refreshSecret: (process.env.JWT_REFRESH_SECRET || '').trim(),
    issuer: process.env.JWT_ISSUER || 'chaudhary-kirana-api',
    audience: process.env.JWT_AUDIENCE || 'chaudhary-kirana-clients'
  },
  databaseUrl: process.env.DATABASE_URL || '',
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
 * Validates production environment configuration without fake fallbacks or weakened security requirements.
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
  checkRequired('DATABASE_URL', config.databaseUrl);

  if (config.supabase.url) {
    if (!config.supabase.url.startsWith('https://')) {
      errors.push(`SUPABASE_URL '${config.supabase.url}' must use HTTPS protocol`);
    }
    if (config.supabase.url.includes('localhost') || config.supabase.url.includes('127.0.0.1')) {
      errors.push(`SUPABASE_URL '${config.supabase.url}' cannot be localhost in production`);
    }
  }

  const placeholders = ['your_', 'change_me', 'example', '123456', 'placeholder', 'secret_key_here', 'replace-me', 'changeme', 'dev_', 'test_'];
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
  if (config.jwt.accessSecret && config.jwt.refreshSecret && config.jwt.accessSecret === config.jwt.refreshSecret) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be identical');
  }

  if (config.databaseUrl) {
    if (!config.databaseUrl.startsWith('postgresql://') && !config.databaseUrl.startsWith('postgres://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL starting with postgresql:// or postgres://');
    }
    if (targetEnv === 'production' && (config.databaseUrl.includes('@localhost') || config.databaseUrl.includes('@127.0.0.1'))) {
      errors.push('DATABASE_URL cannot point to localhost or 127.0.0.1 in production');
    }
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
