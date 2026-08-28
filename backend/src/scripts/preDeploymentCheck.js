const dns = require('dns');
const https = require('https');
const path = require('path');
const { Client } = require('pg');

// Enforce IPv4-first DNS resolution order to resolve IPv6 ENETUNREACH in dual-stack environments
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Custom lookup function forcing IPv4 family (bypasses IPv6 AAAA lookup)
function ipv4Lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, Object.assign({}, options, { family: 4 }), callback);
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
 * Check 1: Environment Variable Integrity
 */
function checkEnvironment() {
  try {
    config.validateEnvironment();
    logPass('Environment configuration verified cleanly');
    return true;
  } catch (err) {
    logFail('Environment configuration validation', err.message, 'Verify required environment variables in .env or CI environment.');
    return false;
  }
}

/**
 * Check 2: JWT Access & Refresh Secret Strength Audit
 */
function checkJwtSecret() {
  const accessSecret = config.jwt.accessSecret || '';
  const refreshSecret = config.jwt.refreshSecret || '';
  const placeholders = ['dev_', '123456', 'your_', 'change_me', 'example', 'secret_key', 'test_', 'replace_me'];

  let isWeak = false;
  let reason = '';

  if (accessSecret.length < 16) {
    isWeak = true;
    reason = `Access secret length is too short (${accessSecret.length} chars)`;
  }
  for (const ph of placeholders) {
    if (accessSecret.toLowerCase().includes(ph) || refreshSecret.toLowerCase().includes(ph)) {
      isWeak = true;
      reason = `Secret contains weak placeholder term '${ph}'`;
      break;
    }
  }

  if (!isWeak) {
    logPass('JWT Secret strength suitable for production deployment');
    return true;
  } else {
    logFail('JWT Secret strength check', reason, 'Generate strong 32+ character secrets using crypto.randomBytes(64).toString("base64url")');
    return false;
  }
}

/**
 * Check 3: Supabase HTTPS API Connectivity
 */
function checkSupabaseConfiguration() {
  return new Promise((resolve) => {
    if (!config.supabase.url || !config.supabase.url.startsWith('https://')) {
      logFail('Supabase Configuration', 'Invalid or non-HTTPS SUPABASE_URL', 'Set SUPABASE_URL to https://your-project.supabase.co');
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
          logPass('Supabase HTTPS API reachable');
          resolve(true);
        } else {
          logFail('Supabase HTTPS API check', `HTTP Status ${res.statusCode}`, 'Check Supabase project status');
          resolve(false);
        }
      });

      req.on('error', (err) => {
        logFail('Supabase HTTPS API check', err.message, 'Verify network connectivity and SUPABASE_URL');
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        logFail('Supabase HTTPS API check', 'Request timeout (5000ms)', 'Check firewall or network access');
        resolve(false);
      });
    } catch (err) {
      logFail('Supabase HTTPS API check', err.message);
      resolve(false);
    }
  });
}

/**
 * Check 4: PostgreSQL Connectivity & Database Schema Audit
 */
async function checkDatabaseConnectivity() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:Anshjain2005%40@db.vuhwlckfhexlyezmfled.supabase.co:5432/postgres';
  
  // Sanitize host & port for safe error reporting
  let sanitizedHost = 'supabase-postgres';
  let port = 5432;
  try {
    const parsedUrl = new URL(dbUrl);
    sanitizedHost = parsedUrl.hostname;
    port = parsedUrl.port || 5432;
  } catch (e) {}

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    lookup: ipv4Lookup
  });

  try {
    await client.connect();
    logPass('PostgreSQL database connection pool established successfully');

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
      logPass(`All ${requiredTables.length} required production database tables exist`);
    } else {
      logFail('Database Schema Audit', `Missing tables: ${missingTables.join(', ')}`, 'Run node backend/src/run_migrations.js');
    }

    await client.end();
    return missingTables.length === 0;
  } catch (dbErr) {
    let failureType = 'DATABASE_CONNECTIVITY_ERROR';
    if (dbErr.code === 'ENETUNREACH' || dbErr.message.includes('ENETUNREACH')) {
      failureType = 'NETWORK_UNREACHABLE (IPv6/IPv4 Route Issue)';
    } else if (dbErr.message.includes('password authentication failed')) {
      failureType = 'AUTHENTICATION_FAILED';
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
 * Main Orchestration Function
 */
async function runPreDeploymentCheck() {
  console.log('====================================================');
  console.log('  CHAUDHARY KIRANA STORE - PRE-DEPLOYMENT AUDIT CHECK');
  console.log('====================================================\n');

  passedChecks = 0;
  failedChecks = 0;

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
    process.exit(0);
  }
}

if (require.main === module) {
  runPreDeploymentCheck();
}

module.exports = runPreDeploymentCheck;
