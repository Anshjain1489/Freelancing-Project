const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  console.log('🔧 Running Migration 049: Catalog Cleanup & Coupon Management...');
  const sqlPath = path.join(__dirname, '../../database/migrations/049_phase46_catalog_cleanup_coupon_management.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('✅ Migration 049 applied successfully!');

    // Check dairy cleanup status
    const inactiveDairyRes = await pool.query(`
      SELECT count(*) FROM products 
      WHERE is_active = FALSE AND (LOWER(name) LIKE '%milk%' OR LOWER(name) LIKE '%paneer%' OR LOWER(name) LIKE '%butter%')
    `);
    console.log(`  ✓ Inactive Dairy items count: ${inactiveDairyRes.rows[0].count}`);

    const gheeRes = await pool.query(`
      SELECT id, name, is_active, selling_price FROM products WHERE LOWER(name) LIKE '%ghee%' OR sku = 'SKU-GHE-001'
    `);
    console.log(`  ✓ Ghee preservation status:`, gheeRes.rows);

  } catch (err) {
    console.error('❌ Migration 049 failed:', err.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
