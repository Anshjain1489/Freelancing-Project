const { Client } = require('pg');
const path = require('path');
const config = require('../config/environment');

async function runPreDeploymentCheck() {
  console.log('====================================================');
  console.log('  CHAUDHARY KIRANA STORE - PRE-DEPLOYMENT AUDIT CHECK');
  console.log('====================================================\n');

  let passedChecks = 0;
  let failedChecks = 0;

  const assertCheck = (title, condition, details = '') => {
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS ${passedChecks}] ${title}`);
    } else {
      failedChecks++;
      console.log(`  ❌ [FAIL ${failedChecks}] ${title}`);
      if (details) console.log(`     Details: ${details}`);
    }
  };

  // 1. Environment Variable Validation
  try {
    config.validateEnvironment();
    assertCheck('Environment configuration verified cleanly', true);
  } catch (err) {
    assertCheck('Environment configuration validation', false, err.message);
  }

  // 2. Secret Strength Check
  const accessSecret = config.jwt.accessSecret || '';
  const isWeakSecret = accessSecret.includes('dev_') || accessSecret.includes('123456') || accessSecret.length < 16;
  assertCheck('JWT Access Secret strength is suitable for deployment', !isWeakSecret, 'JWT secret is too short or contains dev placeholder');

  // 3. Database Connection & Schema Audit
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:Anshjain2005%40@db.vuhwlckfhexlyezmfled.supabase.co:5432/postgres';
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    assertCheck('Database connection pool established successfully', true);

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

    assertCheck('All required production database tables exist', missingTables.length === 0, missingTables.length > 0 ? `Missing tables: ${missingTables.join(', ')}` : '');

    await client.end();
  } catch (dbErr) {
    assertCheck('Database connectivity check', false, dbErr.message);
  }

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
