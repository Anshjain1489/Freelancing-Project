const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const res = await client.query("SELECT * FROM inventory WHERE product_id = 'a1000000-0000-0000-0000-000000000001';");
  console.log('Inventory row:', res.rows);
  const pRes = await client.query("SELECT * FROM products WHERE id = 'a1000000-0000-0000-0000-000000000001';");
  console.log('Product row:', pRes.rows);
  await client.end();
}

check();
