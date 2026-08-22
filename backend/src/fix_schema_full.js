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

    // Orders table coupon columns
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;');

    // Coupons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (minimum_order_amount >= 0),
        discount_type VARCHAR(20) NOT NULL DEFAULT 'FIXED',
        discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed initial coupon rules
    await client.query(`
      INSERT INTO coupons (code, description, minimum_order_amount, discount_type, discount_value, is_active)
      VALUES 
        ('SAVE20', '₹20 OFF on orders above ₹1,000', 1000.00, 'FIXED', 20.00, TRUE),
        ('SAVE50', '₹50 OFF on orders above ₹2,000', 2000.00, 'FIXED', 50.00, TRUE),
        ('SAVE200', '₹200 OFF on orders above ₹5,000', 5000.00, 'FIXED', 200.00, TRUE),
        ('SAVE500', '₹500 OFF on orders above ₹10,000', 10000.00, 'FIXED', 500.00, TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);

    // Delivery Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        delivery_partner_id UUID NOT NULL REFERENCES users(id),
        assigned_by UUID REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
        estimated_ready_at TIMESTAMPTZ,
        estimated_delivery_at TIMESTAMPTZ,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        picked_up_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        failure_reason TEXT,
        delivery_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Phase 17: Inventory Management Columns & Tables
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 50;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert_active BOOLEAN NOT NULL DEFAULT FALSE;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        movement_type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        previous_reserved INTEGER,
        new_reserved INTEGER,
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_stock INTEGER;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_stock INTEGER;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_reserved INTEGER;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_reserved INTEGER;');
    await client.query('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES users(id) ON DELETE SET NULL;');

    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_order_product_sale ON inventory_movements(order_id, product_id, movement_type) WHERE movement_type = \'SALE\';');

    // Phase 18: Cancellation, Return & Replacement Management Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS cancellation_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
        request_reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_active_cancellation_request ON cancellation_requests(order_id) WHERE status = \'REQUESTED\';');

    await client.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        return_number VARCHAR(100) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
        reason TEXT NOT NULL,
        customer_description TEXT,
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        pickup_required BOOLEAN DEFAULT TRUE,
        pickup_delivery_partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        picked_up_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ,
        refund_status VARCHAR(50) DEFAULT 'NOT_INITIATED',
        refund_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_active_return_request ON returns(order_id) WHERE status IN (\'REQUESTED\', \'APPROVED\', \'PICKUP_ASSIGNED\', \'PICKED_UP\', \'RECEIVED\', \'REFUND_PROCESSING\');');

    await client.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
        order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        reason TEXT,
        condition_status VARCHAR(50) DEFAULT 'RESTOCKABLE',
        approved_quantity INTEGER DEFAULT 0 CHECK (approved_quantity >= 0),
        received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
        refund_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS replacement_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
        rejected_at TIMESTAMPTZ,
        rejection_reason TEXT,
        replacement_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_active_replacement_request ON replacement_requests(order_id) WHERE status IN (\'REQUESTED\', \'APPROVED\', \'REPLACEMENT_PROCESSING\', \'READY_FOR_DELIVERY\', \'OUT_FOR_DELIVERY\');');

    await client.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Disable RLS on all operational tables for backend service
    await client.query('ALTER TABLE orders DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE payments DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE order_addresses DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE delivery_assignments DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_deliveries DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE admin_activity_logs DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE inventory_movements DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE cancellation_requests DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE returns DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE return_items DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE replacement_requests DISABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE store_settings DISABLE ROW LEVEL SECURITY;');

    console.log('✅ All table schemas aligned 100%!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fixSchemaFull();
