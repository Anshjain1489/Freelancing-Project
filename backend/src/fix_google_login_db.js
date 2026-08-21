const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function fixGoogleLoginDb() {
  console.log('Connecting to Supabase PostgreSQL to fix Google Login table constraints...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');

    // 1. Drop NOT NULL constraint on phone & password_hash columns so Google OAuth users can register without phone/password
    await client.query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;');
    await client.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;');

    // 2. Add google_id and avatar_url columns if not present
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');

    console.log('✅ Supabase users table constraints updated 100% for Google OAuth!');
  } catch (err) {
    console.error('Error updating users table:', err.message);
  } finally {
    await client.end();
  }
}

fixGoogleLoginDb();
