const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passedTests = 0;
let totalTests = 0;

function runAssertion(title, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS ${totalTests}] ${title}`);
  } catch (err) {
    console.error(`  ❌ [FAIL ${totalTests}] ${title}: ${err.message}`);
    throw err;
  }
}

function getFreshConfig(customEnv = {}) {
  // Clear core test env vars
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.JWT_ACCESS_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  delete process.env.DATABASE_URL;

  for (const [k, v] of Object.entries(customEnv)) {
    process.env[k] = v;
  }

  delete require.cache[require.resolve('./config/environment')];
  return require('./config/environment');
}

console.log('====================================================');
console.log('  PRE-DEPLOYMENT AUDIT QA REGRESSION SUITE');
console.log('====================================================\n');

// Test 1: Missing SUPABASE_URL -> FAIL
runAssertion('Missing SUPABASE_URL correctly fails validation', () => {
  const cfg = getFreshConfig({
    SUPABASE_ANON_KEY: 'key',
    JWT_ACCESS_SECRET: 'secret',
    JWT_REFRESH_SECRET: 'secret2',
    DATABASE_URL: 'postgresql://postgres:pass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment();
  }, /ENVIRONMENT_CONFIGURATION_ERROR/);
});

// Test 2: HTTP Supabase URL -> FAIL
runAssertion('HTTP Supabase URL fails HTTPS security requirement', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'http://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment();
  }, /must use HTTPS protocol/);
});

// Test 3: Localhost SUPABASE_URL in production -> FAIL
runAssertion('Localhost SUPABASE_URL fails production validation', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://localhost:5000',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment('production');
  }, /cannot be localhost in production/);
});

// Test 4: Weak JWT secret -> FAIL
runAssertion('Short JWT Access Secret (<32 chars) fails production validation', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'short_secret',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment('production');
  }, /JWT_ACCESS_SECRET must be at least 32 characters long/);
});

// Test 5: Identical Access and Refresh Secrets -> FAIL
runAssertion('Identical JWT Access & Refresh Secrets fail validation', () => {
  const secret = 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!';
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment('production');
  }, /must not be identical/);
});

// Test 6: Development Placeholders in JWT Secrets -> FAIL
runAssertion('JWT Secret containing dev placeholder term fails validation', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'dev_jwt_access_secret_chaudhary_kirana_2026!',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment('production');
  }, /contains invalid placeholder value/);
});

// Test 7: Localhost DATABASE_URL in Production -> FAIL
runAssertion('Localhost DATABASE_URL fails production validation', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/postgres'
  });
  assert.throws(() => {
    cfg.validateEnvironment('production');
  }, /cannot point to localhost or 127.0.0.1 in production/);
});

// Test 8: Valid Production Credentials -> PASS
runAssertion('Valid production environment configuration passes cleanly', () => {
  const cfg = getFreshConfig({
    SUPABASE_URL: 'https://vuhwlckfhexlyezmfled.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aHdsY2tmaGV4bHllem1mbGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODgxNTgsImV4cCI6MjEwMjg2NDE1OH0.94QQfa75xYoJQ5APORmT21ouAY5TBTIZhHu9JYrH-Ic',
    JWT_ACCESS_SECRET: 'ChaudharyKiranaStore_SuperSecret_Access_JWT_Key_2026!',
    JWT_REFRESH_SECRET: 'ChaudharyKiranaStore_SuperSecret_Refresh_JWT_Key_2026!',
    DATABASE_URL: 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  });
  assert.strictEqual(cfg.validateEnvironment('production'), true);
});

// Test 9: Frontend Secret Exposure Audit
runAssertion('Frontend source code contains zero server-only secrets', () => {
  const frontendDir = path.join(__dirname, '../../frontend/src');
  const serverSecrets = ['SUPABASE_SERVICE_ROLE_KEY', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];

  function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        checkDir(fullPath);
      } else if (f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const sec of serverSecrets) {
          assert.strictEqual(content.includes(sec), false, `Secret ${sec} found in frontend file ${f}`);
        }
      }
    }
  }

  checkDir(frontendDir);
});

console.log('\n====================================================');
console.log(`  AUDIT QA REGRESSION SUITE: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================\n');
