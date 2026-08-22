const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function fixSchemaFull() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase. Aligning all table schemas...');
  try {
    // Users table columns for Google OAuth
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
    await client.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;');
    await client.query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;');

    // Admin activity logs
    await client.query('ALTER TABLE admin_activity_logs DROP CONSTRAINT IF EXISTS admin_activity_logs_admin_id_fkey;');
    await client.query('ALTER TABLE admin_activity_logs ALTER COLUMN admin_id TYPE TEXT;');
    await client.query('ALTER TABLE admin_activity_logs ALTER COLUMN entity_id TYPE TEXT;');
    await client.query('ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);');
    await client.query('ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;');

    // Products table columns
    await client.query('ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;');
    await client.query('ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);');

    // Orders table columns
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'PENDING_PAYMENT\';');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(5,2) DEFAULT 0.00;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempts INT DEFAULT 0;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by UUID;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by UUID;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT \'NOT_REQUIRED\';');

    // Order addresses table columns
    await client.query('ALTER TABLE order_addresses ADD COLUMN IF NOT EXISTS address_line1 TEXT;');
    await client.query('ALTER TABLE order_addresses ADD COLUMN IF NOT EXISTS address_line2 TEXT;');

    // Order items table columns
    await client.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_value NUMERIC(10,2) DEFAULT 1.00;');
    await client.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0.00;');
    await client.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0.00;');

    // Payments table columns
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'PENDING\';');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;');
    await client.query('ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT \'NOT_REQUIRED\';');

    // Notifications table columns
    await client.query('ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;');
    await client.query('ALTER TABLE notifications ALTER COLUMN reference_id TYPE TEXT;');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT \'ORDER\';');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);');
    await client.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;');

    // Notification preferences table columns
    await client.query('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_orders BOOLEAN DEFAULT TRUE;');
    await client.query('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_orders BOOLEAN DEFAULT TRUE;');
    await client.query('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_promotions BOOLEAN DEFAULT FALSE;');

    // Refunds table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
        razorpay_refund_id VARCHAR(100) UNIQUE,
        amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'NOT_INITIATED',
        reason TEXT,
        requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        failure_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Disable RLS on all operational tables for backend service
    await client.query('ALTER TABLE orders DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE payments DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE order_addresses DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_deliveries DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE admin_activity_logs DISABLE ROW LEVEL SECURITY;');

    console.log('✅ All table schemas aligned 100%!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixSchemaFull();
