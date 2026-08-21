const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function fixSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase. Aligning address columns...');
  try {
    await client.query('ALTER TABLE addresses RENAME COLUMN address_line_1 TO address_line1;');
    await client.query('ALTER TABLE addresses RENAME COLUMN address_line_2 TO address_line2;');
    console.log('✅ address_line1 and address_line2 columns aligned successfully!');
  } catch (err) {
    console.log('Notice:', err.message);
  } finally {
    await client.end();
  }
}

fixSchema();
