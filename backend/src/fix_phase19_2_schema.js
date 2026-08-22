const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

async function fixPhase19_2Schema() {
  console.log('====================================================');
  console.log('🛠️ EXECUTING PHASE 19.2 PRODUCTION DATABASE MIGRATION');
  console.log('====================================================\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment!');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to production PostgreSQL database.');

    const sqlPath = path.join(__dirname, '../../database/migrations/033_payment_coupon_consistency_fix.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sqlContent);
    console.log('✅ Migration 033_payment_coupon_consistency_fix.sql executed successfully.');

    // Force PostgREST schema cache reload
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ Executed NOTIFY pgrst, 'reload schema'; to refresh PostgREST schema cache.");

    // Query column info for payments table to confirm
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'payments'
      ORDER BY column_name;
    `);
    const cols = res.rows.map(r => r.column_name);
    console.log('\n📊 Payments Table Columns Verified:');
    console.log(cols.join(', '));

    console.log('\n====================================================');
    console.log('🎉 PHASE 19.2 DB MIGRATION FINISHED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Migration Execution Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixPhase19_2Schema();
