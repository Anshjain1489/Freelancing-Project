const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration050() {
  console.log('=== Running Migration 050: Phase 46 Coupon Catalog Expansion ===');
  const migrationPath = path.join(__dirname, '../../database/migrations/050_phase46_coupon_catalog_update.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // 1. Get count before migration
    const beforeRes = await pool.query('SELECT COUNT(*) FROM coupons');
    const countBefore = parseInt(beforeRes.rows[0].count, 10);
    console.log(`Coupons count before migration: ${countBefore}`);

    // 2. Execute migration
    await pool.query(sql);
    console.log('✓ Migration 050 SQL executed successfully.');

    // 3. Get count after migration
    const afterRes = await pool.query('SELECT COUNT(*) FROM coupons');
    const countAfter = parseInt(afterRes.rows[0].count, 10);
    console.log(`Coupons count after migration: ${countAfter}`);

    // 4. Verify 4 target coupons exist in DB
    const checkRes = await pool.query(`
      SELECT code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, is_active 
      FROM coupons 
      WHERE code IN ('SAVE1000', 'SAVE2000', 'SAVE5000', 'SAVE10000')
      ORDER BY minimum_order_amount ASC
    `);

    console.log('\nInserted Tiered Production Coupons Verification:');
    console.table(checkRes.rows);

    if (checkRes.rows.length === 4) {
      console.log('\n✅ All 4 production coupons verified successfully in PostgreSQL database!');
    } else {
      console.error(`❌ Expected 4 production coupons, found ${checkRes.rows.length}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error executing Migration 050:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration050()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration050;
