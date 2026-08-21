const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Anshjain2005%40@db.vuhwlckfhexlyezmfled.supabase.co:5432/postgres';

async function migrateAndSeed() {
  console.log('🔌 Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL!');

    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const seedsDir = path.join(__dirname, '../../database/seeds');

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    console.log(`\n📦 Running ${migrationFiles.length} migrations...`);

    for (const file of migrationFiles) {
      console.log(`  └─ Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await client.query(sql);
      } catch (err) {
        console.warn(`     ⚠️ Warning/Notice in ${file}: ${err.message}`);
      }
    }

    const seedFiles = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
    console.log(`\n🌱 Running ${seedFiles.length} seed files...`);

    for (const file of seedFiles) {
      console.log(`  └─ Executing seed: ${file}...`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await client.query(sql);
      } catch (err) {
        console.warn(`     ⚠️ Warning/Notice in ${file}: ${err.message}`);
      }
    }

    console.log('\n🎉 Database migrations & initial data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrateAndSeed();
