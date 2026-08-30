const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Enforce IPv4-first DNS resolution order to resolve IPv6 ENETUNREACH in dual-stack networks
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Multi-location local environment loader
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

const getEnvVar = (name, fallback = '') => {
  const val = process.env[name];
  return (val !== undefined && val !== null ? String(val) : fallback).trim();
};

const knownPlaceholders = [
  'your_',
  'change_me',
  'changeme',
  'example',
  '123456',
  'placeholder',
  'secret_key_here',
  'replace-me',
  'secret',
  'password',
  'development-secret',
  'your-secret',
  'test-secret',
  'dev_',
  'test_'
];

/**
 * Central Environment Validation Function
 */
function validateEnvironment(targetEnvOverride = null) {
  const nodeEnv = targetEnvOverride || getEnvVar('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';
  const errors = [];
  const warnings = [];

  const supabaseUrl = getEnvVar('SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  const databaseUrl = getEnvVar('DATABASE_URL');
  const jwtAccessSecret = getEnvVar('JWT_ACCESS_SECRET') || getEnvVar('JWT_SECRET');
  const jwtRefreshSecret = getEnvVar('JWT_REFRESH_SECRET');

  // 1. Missing Required Variables
  if (!supabaseUrl) errors.push('Missing required environment variable: SUPABASE_URL');
  if (!supabaseAnonKey) errors.push('Missing required environment variable: SUPABASE_ANON_KEY');
  if (!supabaseServiceRoleKey) warnings.push('SUPABASE_SERVICE_ROLE_KEY is not configured (Admin backend functions may run in restricted mode)');
  if (!databaseUrl) errors.push('Missing required environment variable: DATABASE_URL');
  if (!jwtAccessSecret) errors.push('Missing required environment variable: JWT_ACCESS_SECRET');
  if (!jwtRefreshSecret) errors.push('Missing required environment variable: JWT_REFRESH_SECRET');

  // 2. Malformed SUPABASE_URL
  if (supabaseUrl) {
    if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
      errors.push(`SUPABASE_URL must start with http:// or https://`);
    }
    if (isProd && !supabaseUrl.startsWith('https://')) {
      errors.push(`Production SUPABASE_URL must use HTTPS protocol`);
    }
    if (isProd && (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'))) {
      errors.push(`Production SUPABASE_URL cannot point to localhost or 127.0.0.1`);
    }
  }

  // 3. JWT Secret Validation
  const minJwtLength = isProd ? 32 : 16;

  const isPlaceholder = (val) => {
    if (!val) return false;
    const lower = val.toLowerCase();
    return knownPlaceholders.some(ph => lower.includes(ph));
  };

  if (jwtAccessSecret) {
    if (isPlaceholder(jwtAccessSecret)) {
      errors.push(`JWT_ACCESS_SECRET contains an insecure development placeholder value`);
    }
    if (jwtAccessSecret.length < minJwtLength) {
      errors.push(`JWT_ACCESS_SECRET must be at least ${minJwtLength} characters long (current length: ${jwtAccessSecret.length})`);
    }
  }

  if (jwtRefreshSecret) {
    if (isPlaceholder(jwtRefreshSecret)) {
      errors.push(`JWT_REFRESH_SECRET contains an insecure development placeholder value`);
    }
    if (jwtRefreshSecret.length < minJwtLength) {
      errors.push(`JWT_REFRESH_SECRET must be at least ${minJwtLength} characters long (current length: ${jwtRefreshSecret.length})`);
    }
  }

  if (jwtAccessSecret && jwtRefreshSecret && jwtAccessSecret === jwtRefreshSecret) {
    errors.push(`JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be separate, distinct keys`);
  }

  // 4. DATABASE_URL Validation
  if (databaseUrl) {
    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL starting with postgresql:// or postgres://');
    }
    if (isProd && (databaseUrl.includes('@localhost') || databaseUrl.includes('@127.0.0.1'))) {
      errors.push('DATABASE_URL cannot point to localhost or 127.0.0.1 in production');
    }
  }

  if (errors.length > 0) {
    const errorMsg = `[ENVIRONMENT_CONFIGURATION_ERROR]\n${errors.map(e => `  - ${e}`).join('\n')}`;
    const err = new Error(errorMsg);
    err.errors = errors;
    err.warnings = warnings;
    throw err;
  }

  return { valid: true, nodeEnv, isProd, warnings };
}

const envConfig = {
  env: getEnvVar('NODE_ENV', 'development'),
  isProduction: getEnvVar('NODE_ENV') === 'production',
  port: parseInt(getEnvVar('PORT', '5000'), 10),
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
  publicAppUrl: getEnvVar('PUBLIC_APP_URL') || getEnvVar('FRONTEND_URL', 'http://localhost:5173'),
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  },
  jwt: {
    accessSecret: getEnvVar('JWT_ACCESS_SECRET') || getEnvVar('JWT_SECRET'),
    refreshSecret: getEnvVar('JWT_REFRESH_SECRET'),
    issuer: getEnvVar('JWT_ISSUER', 'chaudhary-kirana-api'),
    audience: getEnvVar('JWT_AUDIENCE', 'chaudhary-kirana-clients')
  },
  databaseUrl: getEnvVar('DATABASE_URL'),
  google: {
    clientId: getEnvVar('GOOGLE_CLIENT_ID'),
    clientSecret: getEnvVar('GOOGLE_CLIENT_SECRET')
  },
  razorpay: {
    keyId: getEnvVar('RAZORPAY_KEY_ID'),
    keySecret: getEnvVar('RAZORPAY_KEY_SECRET'),
    webhookSecret: getEnvVar('RAZORPAY_WEBHOOK_SECRET')
  },
  store: {
    name: getEnvVar('STORE_NAME', 'Chaudhary Kirana Store'),
    owner: getEnvVar('STORE_OWNER', 'Akash Chaudhary'),
    phone1: getEnvVar('PRIMARY_PHONE', '7897837095'),
    phone2: getEnvVar('SECONDARY_PHONE', '7007550184'),
    address: getEnvVar('STORE_ADDRESS', 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP'),
    latitude: parseFloat(getEnvVar('STORE_LATITUDE', '24.2381')),
    longitude: parseFloat(getEnvVar('STORE_LONGITUDE', '78.7364')),
    minOrderValue: parseFloat(getEnvVar('MIN_ORDER_VALUE', '199.0')),
    freeDeliveryRadiusKm: parseFloat(getEnvVar('FREE_DELIVERY_RADIUS_KM', '0.0')),
    deliveryChargePerExtraKm: parseFloat(getEnvVar('DELIVERY_CHARGE_PER_EXTRA_KM', '10.0')),
    maxDeliveryRadiusKm: parseFloat(getEnvVar('MAX_DELIVERY_RADIUS_KM', '15.0'))
  },
  monitoring: {
    sentryDsn: getEnvVar('SENTRY_DSN'),
    logLevel: getEnvVar('LOG_LEVEL', 'info')
  },
  rateLimit: {
    windowMs: parseInt(getEnvVar('RATE_LIMIT_WINDOW_MS', '60000'), 10),
    maxRequests: parseInt(getEnvVar('RATE_LIMIT_MAX', '100'), 10)
  },
  validateEnvironment
};

module.exports = envConfig;
