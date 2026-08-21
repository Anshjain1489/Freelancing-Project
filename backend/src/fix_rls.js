const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function fixRLS() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase. Updating RLS policy on users table...');
  try {
    await client.query('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE addresses DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE carts DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE orders DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_deliveries DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE products DISABLE ROW LEVEL SECURITY;');
    console.log('✅ RLS updated for Express REST API backend access!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixRLS();
