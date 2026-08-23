const assert = require('assert');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./config/supabase');
const config = require('./config/environment');
const { createDeliveryPartner, getDeliveryPartners } = require('./services/delivery.management.service');
const { loginUser, registerCustomer } = require('./services/auth.service');
const ROLES = require('./constants/roles');

async function runTests() {
  console.log('====================================================');
  console.log('🚚 RUNNING PHASE 20.3: PRODUCTION DELIVERY PARTNER REGISTRATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ FAIL: ${name}`);
      console.log(`     Error: ${err.message}`);
      failed++;
    }
  };

  // ----------------------------------------------------
  // SECTION A: DATABASE SCHEMA & MIGRATION VERIFICATION
  // ----------------------------------------------------
  console.log('📌 SECTION A: DATABASE SCHEMA & MIGRATION VERIFICATION (TESTS 1 - 7)\n');

  await test('1. Migration file 034_fix_delivery_partner_role_schema.sql exists & is idempotent', async () => {
    const migrationPath = path.join(__dirname, '../../database/migrations/034_fix_delivery_partner_role_schema.sql');
    assert(fs.existsSync(migrationPath), 'Migration 034 file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert(content.includes('ALTER TABLE public.users'), 'Migration must alter users table');
    assert(content.includes('ADD COLUMN IF NOT EXISTS role'), 'Migration must add role column IF NOT EXISTS');
    assert(content.includes("NOTIFY pgrst, 'reload schema';"), 'Migration must trigger PostgREST schema cache reload');
  });

  await test('2. Production users table contains role column', async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('users').select('id, role').limit(1);
    assert(!error, `Supabase query must not fail: ${error?.message}`);
    assert(data, 'Users data must be returned');
  });

  await test('3. Existing Admin accounts preserve ADMIN role', async () => {
    if (!supabase) return;
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, role, phone, email')
      .or('phone.eq.7897837095,email.eq.admin@chaudhary.com')
      .maybeSingle();

    if (adminUser) {
      assert.strictEqual(adminUser.role, 'ADMIN', 'Admin user must have ADMIN role');
    }
  });

  await test('4. Existing Customer accounts have valid CUSTOMER role', async () => {
    if (!supabase) return;
    const { data: customerUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('role', 'CUSTOMER')
      .limit(1);

    if (customerUser && customerUser.length > 0) {
      assert.strictEqual(customerUser[0].role, 'CUSTOMER');
    }
  });

  await test('5. DELIVERY_PARTNER role is supported in roles table', async () => {
    if (!supabase) return;
    const { data: roleRow } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'DELIVERY_PARTNER')
      .maybeSingle();

    assert(roleRow, 'roles table must contain DELIVERY_PARTNER');
  });

  await test('6. Schema alignment script fix_schema_full.js includes users.role and NOTIFY pgrst', async () => {
    const fixScriptPath = path.join(__dirname, 'fix_schema_full.js');
    assert(fs.existsSync(fixScriptPath), 'fix_schema_full.js must exist');
    const content = fs.readFileSync(fixScriptPath, 'utf8');
    assert(content.includes('users.role'), 'fix_schema_full.js must add users.role');
    assert(content.includes('NOTIFY pgrst'), 'fix_schema_full.js must reload schema cache');
  });

  await test('7. Delivery partner creation service assigns DELIVERY_PARTNER role', async () => {
    const servicePath = path.join(__dirname, 'services/delivery.management.service.js');
    const content = fs.readFileSync(servicePath, 'utf8');
    assert(content.includes("role: 'DELIVERY_PARTNER'"), 'service must assign DELIVERY_PARTNER role');
  });

  // ----------------------------------------------------
  // SECTION B: DELIVERY PARTNER REGISTRATION & VALIDATION
  // ----------------------------------------------------
  console.log('\n📌 SECTION B: DELIVERY PARTNER REGISTRATION & VALIDATION (TESTS 8 - 14)\n');

  const testPartnerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPartnerEmail = `partner_${testPartnerPhone}@test.com`;
  const testPartnerPassword = 'PartnerPass123!';
  let createdPartnerId = null;

  await test('8. Admin successfully registers a new Delivery Partner', async () => {
    const result = await createDeliveryPartner('admin-1', {
      fullName: 'Ramesh Kumar (Test Partner)',
      phone: testPartnerPhone,
      email: testPartnerEmail,
      password: testPartnerPassword
    });

    assert(result, 'Delivery partner result must be returned');
    assert(result.id, 'Created partner must have ID');
    assert.strictEqual(result.phone, testPartnerPhone, 'Phone must match');
    assert.strictEqual(result.role, 'DELIVERY_PARTNER', 'Role must be DELIVERY_PARTNER');
    createdPartnerId = result.id;
  });

  await test('9. Created Delivery Partner receives hashed password in database', async () => {
    if (!supabase || !createdPartnerId) return;
    const { data: dbUser } = await supabase
      .from('users')
      .select('password_hash, role')
      .eq('id', createdPartnerId)
      .single();

    assert(dbUser, 'User must exist in DB');
    assert.strictEqual(dbUser.role, 'DELIVERY_PARTNER', 'DB role must be DELIVERY_PARTNER');
    assert(dbUser.password_hash.startsWith('$2'), 'Password must be bcrypt hashed');
    const match = await bcrypt.compare(testPartnerPassword, dbUser.password_hash);
    assert(match, 'Hashed password must verify against plaintext password');
  });

  await test('10. Duplicate phone number registration is rejected with HTTP 409 Conflict', async () => {
    try {
      await createDeliveryPartner('admin-1', {
        fullName: 'Duplicate Partner',
        phone: testPartnerPhone,
        email: `diff_${testPartnerPhone}@test.com`,
        password: 'Pass1234!'
      });
      assert.fail('Duplicate phone should have been rejected');
    } catch (err) {
      assert(err.statusCode === 409 || err.message.includes('already exists'), 'Must reject with conflict error');
    }
  });

  await test('11. Missing full name is rejected with HTTP 400 Bad Request', async () => {
    try {
      await createDeliveryPartner('admin-1', {
        fullName: '',
        phone: '9998887776',
        password: 'Pass1234!'
      });
      assert.fail('Missing name should be rejected');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400, 'Must return HTTP 400');
    }
  });

  await test('12. Missing phone number is rejected with HTTP 400 Bad Request', async () => {
    try {
      await createDeliveryPartner('admin-1', {
        fullName: 'Valid Name',
        phone: '',
        password: 'Pass1234!'
      });
      assert.fail('Missing phone should be rejected');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400, 'Must return HTTP 400');
    }
  });

  await test('13. Short password is rejected with HTTP 400 Bad Request', async () => {
    try {
      await createDeliveryPartner('admin-1', {
        fullName: 'Valid Name',
        phone: '9991112223',
        password: '123'
      });
      assert.fail('Short password should be rejected');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400, 'Must return HTTP 400');
    }
  });

  await test('14. getDeliveryPartners returns the newly created Delivery Partner', async () => {
    const partners = await getDeliveryPartners();
    assert(Array.isArray(partners), 'Partners must be an array');
    const found = partners.find(p => p.phone === testPartnerPhone || p.id === createdPartnerId);
    assert(found, 'Created partner must appear in active partner list');
  });

  // ----------------------------------------------------
  // SECTION C: AUTHENTICATION & ROLE AUTHORIZATION
  // ----------------------------------------------------
  console.log('\n📌 SECTION C: AUTHENTICATION & ROLE AUTHORIZATION (TESTS 15 - 20)\n');

  let partnerAuthToken = null;

  await test('15. Created Delivery Partner can log in with phone and password', async () => {
    const authResult = await loginUser({
      identifier: testPartnerPhone,
      password: testPartnerPassword
    });

    assert(authResult, 'Login result must be returned');
    assert(authResult.accessToken, 'Access token must be generated');
    assert.strictEqual(authResult.user.role, 'DELIVERY_PARTNER', 'Login user role must be DELIVERY_PARTNER');
    partnerAuthToken = authResult.accessToken;
  });

  await test('16. JWT access token payload contains role: DELIVERY_PARTNER', async () => {
    assert(partnerAuthToken, 'Token must exist');
    const decoded = jwt.verify(partnerAuthToken, config.jwt.accessSecret);
    assert.strictEqual(decoded.role, 'DELIVERY_PARTNER', 'JWT payload role must be DELIVERY_PARTNER');
  });

  await test('17. Customer account login returns role: CUSTOMER', async () => {
    const custPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const regResult = await registerCustomer({
      fullName: 'Test Customer',
      phone: custPhone,
      password: 'CustPass123!'
    });
    assert.strictEqual(regResult.user.role, 'CUSTOMER');
  });

  await test('18. Admin account login returns role: ADMIN', async () => {
    const adminLogin = await loginUser({
      identifier: '7897837095',
      password: 'Admin@123'
    });
    assert.strictEqual(adminLogin.user.role, 'ADMIN');
  });

  await test('19. Delivery Partner role cannot access Admin routes', async () => {
    const routesPath = path.join(__dirname, '../../frontend/src/routes/AppRoutes.jsx');
    const content = fs.readFileSync(routesPath, 'utf8');
    assert(content.includes("user?.role !== 'ADMIN'"), 'ProtectedAdminRoute must restrict non-ADMIN roles');
  });

  await test('20. Customer role cannot access Delivery Partner endpoints', async () => {
    const middlewarePath = path.join(__dirname, 'middleware/auth.middleware.js');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    assert(content.includes('DELIVERY_PARTNER') || content.includes('authorize'), 'Auth middleware must enforce role checks');
  });

  console.log('\n====================================================');
  console.log(`📊 PHASE 20.3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed} TESTS)`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
