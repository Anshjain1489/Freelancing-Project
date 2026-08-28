const dns = require('dns');
const https = require('https');
const path = require('path');
const { Client } = require('pg');

// Enforce IPv4-first DNS resolution order to resolve IPv6 ENETUNREACH in dual-stack environments
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const config = require('../config/environment');

let passedChecks = 0;
let failedChecks = 0;

const logPass = (title) => {
  passedChecks++;
  console.log(`  ✅ [PASS ${passedChecks}] ${title}`);
};

const logFail = (title, details = '', suggestion = '') => {
  failedChecks++;
  console.log(`  ❌ [FAIL ${failedChecks}] ${title}`);
  if (details) console.log(`     Details: ${details}`);
  if (suggestion) console.log(`     Suggestion: ${suggestion}`);
};

/**
 * Check 1: Environment Variable Integrity Audit
 */
function checkEnvironment() {
  try {
    config.validateEnvironment();
    logPass('Environment configuration verified cleanly');
    return true;
  } catch (err) {
    logFail('Environment configuration validation', err.message, 'Verify required environment variables in GitHub Secrets or .env environment.');
    return false;
  }
}

/**
 * Check 2: JWT Access & Refresh Secret Strength & Distinction Audit
 */
function checkJwtSecret() {
  const accessSecret = config.jwt.accessSecret || '';
  const refreshSecret = config.jwt.refreshSecret || '';
  const placeholders = ['dev_', '123456', 'your_', 'change_me', 'example', 'secret_key', 'test_', 'replace_me', 'changeme'];

  let isWeak = false;
  let reason = '';

  if (!accessSecret || !refreshSecret) {
    isWeak = true;
    reason = `Access secret length is too short (${accessSecret.length} chars)`;
  } else if (accessSecret.length < 16) {
    isWeak = true;
    reason = `Access secret length is too short (${accessSecret.length} chars)`;
  } else if (accessSecret === refreshSecret) {
    isWeak = true;
    reason = 'JWT Access Secret and Refresh Secret are identical';
  } else {
    for (const ph of placeholders) {
      if (accessSecret.toLowerCase().includes(ph) || refreshSecret.toLowerCase().includes(ph)) {
        isWeak = true;
        reason = `Secret contains weak placeholder term '${ph}'`;
        break;
      }
    }
  }

  if (!isWeak) {
    logPass('JWT Secret strength check');
    return true;
  } else {
    logFail('JWT Secret strength check', reason, 'Generate strong 32+ character secrets using crypto.randomBytes(64).toString("base64url")');
    return false;
  }
}

/**
 * Check 3: Supabase HTTPS API Configuration & Connectivity
 */
function checkSupabaseConfiguration() {
  return new Promise((resolve) => {
    if (!config.supabase.url || !config.supabase.url.startsWith('https://')) {
      logFail('Supabase Configuration', 'Invalid or non-HTTPS SUPABASE_URL', 'Set SUPABASE_URL to https://<project-ref>.supabase.co in GitHub Secrets');
      return resolve(false);
    }

    try {
      const url = new URL(`${config.supabase.url}/rest/v1/`);
      const req = https.get(url, {
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`
        },
        family: 4,
        timeout: 5000
      }, (res) => {
        if (res.statusCode < 500) {
          logPass('Supabase Configuration');
          resolve(true);
        } else {
          logFail('Supabase Configuration', `HTTP Status ${res.statusCode}`, 'Verify Supabase project health and anon key');
          resolve(false);
        }
      });

      req.on('error', (err) => {
        logFail('Supabase Configuration', `HTTPS Request Error: ${err.message}`, 'Verify network connectivity and SUPABASE_URL');
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        logFail('Supabase Configuration', 'HTTPS Request Timeout (5000ms)', 'Check firewall or network connectivity');
        resolve(false);
      });
    } catch (err) {
      logFail('Supabase Configuration', err.message);
      resolve(false);
    }
  });
}

/**
 * Check 4: PostgreSQL Connectivity & Database Schema Audit
 */
async function checkDatabaseConnectivity() {
  const dbUrl = config.databaseUrl || process.env.DATABASE_URL || '';
  
  if (!dbUrl) {
    logFail('PostgreSQL Database connectivity check', 'Missing required environment variable: DATABASE_URL', 'Set DATABASE_URL in GitHub Secrets or .env file');
    return false;
  }

  // Sanitize host & port for safe, non-leaking diagnostic reporting
  let sanitizedHost = 'unknown-host';
  let port = 5432;
  try {
    const parsedUrl = new URL(dbUrl);
    sanitizedHost = parsedUrl.hostname;
    port = parsedUrl.port || 5432;
  } catch (e) {
    logFail('PostgreSQL Database connectivity check', 'Invalid DATABASE_URL format', 'Provide valid PostgreSQL connection string starting with postgresql://');
    return false;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();

    const requiredTables = [
      'organizations',
      'stores',
      'store_branding',
      'store_settings',
      'feature_flags',
      'users',
      'products',
      'orders',
      'invoices',
      'inventory'
    ];

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1);
    `, [requiredTables]);

    const foundTables = res.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !foundTables.includes(t));

    if (missingTables.length === 0) {
      logPass('PostgreSQL Database connectivity check');
    } else {
      logFail('Database Schema Audit', `Missing required production tables: ${missingTables.join(', ')}`, 'Execute database migration script (node backend/src/run_migrations.js)');
    }

    await client.end();
    return missingTables.length === 0;
  } catch (dbErr) {
    let failureType = 'DATABASE_CONNECTIVITY_ERROR';
    if (dbErr.code === 'ENETUNREACH' || dbErr.message.includes('ENETUNREACH')) {
      failureType = 'NETWORK_UNREACHABLE';
    } else if (dbErr.message.includes('password authentication failed') || dbErr.code === '28P01') {
      failureType = 'AUTHENTICATION_FAILED';
    } else if (dbErr.message.includes('timeout') || dbErr.code === '57P01') {
      failureType = 'DATABASE_TIMEOUT';
    } else if (dbErr.message.includes('SSL') || dbErr.message.includes('tls')) {
      failureType = 'SSL_VERIFICATION_FAILED';
    }

    logFail(
      'PostgreSQL Database connectivity check',
      `Type: ${failureType} | Host: ${sanitizedHost} | Port: ${port} | Message: ${dbErr.message}`,
      'Verify DATABASE_URL hostname, Supabase pooler, network firewall, and IPv4 DNS routing'
    );
    return false;
  }
}

/**
 * Safe CI Secret Presence Check (Outputs configured status WITHOUT values)
 */
function logSecretPresence() {
  console.log('--- CI Environment Secret Presence Check ---');
  console.log(`✓ SUPABASE_URL configured: ${Boolean(config.supabase.url && config.supabase.url.trim())}`);
  console.log(`✓ SUPABASE_ANON_KEY configured: ${Boolean(config.supabase.anonKey && config.supabase.anonKey.trim())}`);
  console.log(`✓ SUPABASE_SERVICE_ROLE_KEY configured: ${Boolean(config.supabase.serviceRoleKey && config.supabase.serviceRoleKey.trim())}`);
  console.log(`✓ JWT_ACCESS_SECRET configured: ${Boolean(config.jwt.accessSecret && config.jwt.accessSecret.trim())}`);
  console.log(`✓ JWT_REFRESH_SECRET configured: ${Boolean(config.jwt.refreshSecret && config.jwt.refreshSecret.trim())}`);
  console.log(`✓ DATABASE_URL configured: ${Boolean(config.databaseUrl && config.databaseUrl.trim())}`);
  console.log('--------------------------------------------\n');
}

/**
 * Main Audit Orchestrator
 */
async function runPreDeploymentCheck() {
  console.log('====================================================');
  console.log('  CHAUDHARY KIRANA STORE - PRE-DEPLOYMENT AUDIT CHECK');
  console.log('====================================================\n');

  passedChecks = 0;
  failedChecks = 0;

  logSecretPresence();

  checkEnvironment();
  checkJwtSecret();
  await checkSupabaseConfiguration();
  await checkDatabaseConnectivity();

  console.log('\n====================================================');
  console.log(`  PRE-DEPLOYMENT AUDIT SUMMARY: ${passedChecks} PASSED, ${failedChecks} FAILED`);
  console.log('====================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    console.log('STATUS: READY FOR DEPLOYMENT\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runPreDeploymentCheck();
}

module.exports = runPreDeploymentCheck;
