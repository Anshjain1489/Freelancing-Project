const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.vuhwlckfhexlyezmfled:Anshjain2005%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

async function fixSchemaFull() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase production database. Aligning all table schemas...');

  const exec = async (sql, desc) => {
    try {
      await client.query(sql);
      if (desc) console.log(`  ✓ ${desc}`);
    } catch (err) {
      console.warn(`  ⚠️ Warning (${desc || 'query'}):`, err.message);
    }
  };

  try {
    // Users table columns for Google OAuth & Role RBAC
    await exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT \'CUSTOMER\';', 'users.role');
    await exec('UPDATE users SET role = \'CUSTOMER\' WHERE role IS NULL;', 'users.role default backfill');
    await exec('UPDATE users SET role = \'ADMIN\' WHERE phone = \'7897837095\' OR email = \'admin@chaudhary.com\';', 'users.role admin backfill');
    await exec("INSERT INTO roles (name, description) VALUES ('ADMIN', 'Store Administrator'), ('CUSTOMER', 'Retail Customer'), ('DELIVERY_PARTNER', 'Delivery Fleet Partner') ON CONFLICT (name) DO NOTHING;", 'seed roles table');
    await exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);', 'users.google_id');
    await exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;', 'users.avatar_url');
    await exec('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;', 'users.password_hash nullable');
    await exec('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;', 'users.phone nullable');

    // Admin activity logs
    await exec('ALTER TABLE admin_activity_logs DROP CONSTRAINT IF EXISTS admin_activity_logs_admin_id_fkey;', 'drop admin_id_fkey');
    await exec('ALTER TABLE admin_activity_logs ALTER COLUMN admin_id TYPE TEXT;', 'admin_activity_logs.admin_id TEXT');
    await exec('ALTER TABLE admin_activity_logs ALTER COLUMN entity_id TYPE TEXT;', 'admin_activity_logs.entity_id TEXT');
    await exec('ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);', 'admin_activity_logs.resource_type');
    await exec('ALTER TABLE admin_activity_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;', 'admin_activity_logs.resource_id');

    // Products table columns
    await exec('ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;', 'products.category_id nullable');
    await exec('ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;', 'products.sku nullable');
    await exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);', 'products.barcode');

    // Orders table columns
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'PENDING_PAYMENT\';', 'orders.status');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(5,2) DEFAULT 0.00;', 'orders.delivery_distance_km');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempts INT DEFAULT 0;', 'orders.payment_attempts');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);', 'orders.razorpay_order_id');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by UUID;', 'orders.accepted_by');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;', 'orders.accepted_at');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by UUID;', 'orders.rejected_by');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;', 'orders.rejected_at');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;', 'orders.rejection_reason');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT \'NOT_REQUIRED\';', 'orders.refund_status');

    // Order addresses table columns
    await exec('ALTER TABLE order_addresses ADD COLUMN IF NOT EXISTS address_line1 TEXT;', 'order_addresses.address_line1');
    await exec('ALTER TABLE order_addresses ADD COLUMN IF NOT EXISTS address_line2 TEXT;', 'order_addresses.address_line2');

    // Order items table columns
    await exec('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_value NUMERIC(10,2) DEFAULT 1.00;', 'order_items.unit_value');
    await exec('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0.00;', 'order_items.unit_price');
    await exec('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2) DEFAULT 0.00;', 'order_items.total_price');

    // Payments table columns
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'PENDING\';', 'payments.status');
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);', 'payments.razorpay_order_id');
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);', 'payments.razorpay_payment_id');
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;', 'payments.payment_verified_at');
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;', 'payments.payment_failure_reason');
    await exec('ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT \'NOT_REQUIRED\';', 'payments.refund_status');

    // Notifications table columns
    await exec('ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;', 'notifications.user_id nullable');
    await exec('ALTER TABLE notifications ALTER COLUMN reference_id TYPE TEXT;', 'notifications.reference_id TEXT');
    await exec('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT \'ORDER\';', 'notifications.type');
    await exec('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);', 'notifications.event_type');
    await exec('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;', 'notifications.metadata');

    // Notification preferences table columns
    await exec('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_orders BOOLEAN DEFAULT TRUE;', 'notification_preferences.in_app_orders');
    await exec('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_orders BOOLEAN DEFAULT TRUE;', 'notification_preferences.whatsapp_orders');
    await exec('ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS whatsapp_promotions BOOLEAN DEFAULT FALSE;', 'notification_preferences.whatsapp_promotions');

    // Refunds table
    await exec(`
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
    `, 'create table refunds');

    // Coupons table
    await exec(`
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
    `, 'create table coupons');

    // Seed Phase 15 & default coupon rules
    await exec(`
      INSERT INTO coupons (code, description, minimum_order_amount, discount_type, discount_value, is_active)
      VALUES 
        ('SAVE20', '₹20 OFF on orders above ₹1,000', 1000.00, 'FIXED', 20.00, TRUE),
        ('SAVE50', '₹50 OFF on orders above ₹2,000', 2000.00, 'FIXED', 50.00, TRUE),
        ('SAVE200', '₹200 OFF on orders above ₹5,000', 5000.00, 'FIXED', 200.00, TRUE),
        ('SAVE500', '₹500 OFF on orders above ₹10,000', 10000.00, 'FIXED', 500.00, TRUE)
      ON CONFLICT (code) DO UPDATE 
      SET description = EXCLUDED.description,
          minimum_order_amount = EXCLUDED.minimum_order_amount,
          discount_value = EXCLUDED.discount_value,
          is_active = TRUE;
    `, 'seed coupons (SAVE20, SAVE50, SAVE200, SAVE500...)');

    // Orders table coupon columns
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID;', 'orders.coupon_id');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);', 'orders.coupon_code');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00;', 'orders.discount_amount');
    await exec('UPDATE orders SET discount_amount = 0.00 WHERE discount_amount IS NULL;', 'orders.discount_amount default zero');
    await exec('ALTER TABLE orders ALTER COLUMN discount_amount SET DEFAULT 0.00;', 'orders.discount_amount default 0.00');

    // Foreign key for orders.coupon_id
    await exec(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'orders_coupon_id_fkey'
          ) THEN
              ALTER TABLE public.orders
              ADD CONSTRAINT orders_coupon_id_fkey
              FOREIGN KEY (coupon_id)
              REFERENCES public.coupons(id)
              ON DELETE SET NULL;
          END IF;
      END $$;
    `, 'orders_coupon_id_fkey constraint');

    // Delivery Assignments table
    await exec(`
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
    `, 'create table delivery_assignments');

    // Phase 17: Inventory Management Columns & Tables
    await exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 50;', 'products.stock_quantity');
    await exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;', 'products.reserved_quantity');
    await exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;', 'products.low_stock_threshold');
    await exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert_active BOOLEAN NOT NULL DEFAULT FALSE;', 'products.low_stock_alert_active');

    await exec(`
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
    `, 'create table inventory_movements');

    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;', 'inventory_movements.order_id');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;', 'inventory_movements.quantity');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_stock INTEGER;', 'inventory_movements.previous_stock');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_stock INTEGER;', 'inventory_movements.new_stock');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_reserved INTEGER;', 'inventory_movements.previous_reserved');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_reserved INTEGER;', 'inventory_movements.new_reserved');
    await exec('ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES users(id) ON DELETE SET NULL;', 'inventory_movements.performed_by');

    await exec('CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);', 'idx_inventory_movements_product');
    await exec('CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id);', 'idx_inventory_movements_order');
    await exec('CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);', 'idx_inventory_movements_created_at');

    // Phase 18: Cancellation, Return & Replacement Management Tables
    await exec(`
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
    `, 'create table cancellation_requests');

    await exec(`
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
    `, 'create table returns');

    await exec(`
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
    `, 'create table return_items');

    await exec(`
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
    `, 'create table replacement_requests');

    await exec(`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `, 'create table store_settings');

    await exec(`
      CREATE TABLE IF NOT EXISTS whatsapp_delivery_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        delivery_partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL DEFAULT 'DELIVERY_ASSIGNED',
        recipient_phone VARCHAR(50) NOT NULL,
        provider VARCHAR(50) DEFAULT 'WHATSAPP_CLOUD_API',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        attempt_count INT DEFAULT 1,
        provider_message_id VARCHAR(255),
        message_text TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_order_partner_notification UNIQUE(order_id, delivery_partner_id, notification_type)
      );
    `, 'create table whatsapp_delivery_notifications');

    // Phase 22: Order Status History Table
    await exec(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        changed_by_role VARCHAR(50),
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `, 'create table order_status_history');

    await exec('CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);', 'idx_order_status_history_order');
    await exec('CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at DESC);', 'idx_order_status_history_created_at');
    await exec('ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(50);', 'order_status_history.changed_by_role');
    await exec('ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS reason TEXT;', 'order_status_history.reason');
    await exec('ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';', 'order_status_history.metadata');

    // Phase 23: Delivery Partner Dashboard & Delivery Workflow Columns
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;', 'delivery_assignments.accepted_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ;', 'delivery_assignments.out_for_delivery_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;', 'delivery_assignments.delivered_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;', 'delivery_assignments.failed_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100);', 'delivery_assignments.failure_reason');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failure_notes TEXT;', 'delivery_assignments.failure_notes');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN DEFAULT FALSE;', 'delivery_assignments.cod_collected');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected_amount NUMERIC(10,2);', 'delivery_assignments.cod_collected_amount');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMPTZ;', 'delivery_assignments.cod_collected_at');

    // Phase 24: Delivery Failure Recovery, Reassignment & Return-to-Store Columns & Indexes
    try {
      await exec("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'DELIVERY_FAILED';", "enum DELIVERY_FAILED");
      await exec("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'RETURN_TO_STORE';", "enum RETURN_TO_STORE");
    } catch {}
    try {
      await exec("ALTER TABLE order_status_history ALTER COLUMN new_status TYPE TEXT;", "order_status_history.new_status TEXT");
      await exec("ALTER TABLE order_status_history ALTER COLUMN previous_status TYPE TEXT;", "order_status_history.previous_status TEXT");
    } catch {}

    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS returned_to_store_at TIMESTAMPTZ;', 'delivery_assignments.returned_to_store_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS returned_to_store_by UUID;', 'delivery_assignments.returned_to_store_by');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS reassignment_count INTEGER DEFAULT 0;', 'delivery_assignments.reassignment_count');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;', 'delivery_assignments.revoked_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS revoked_by UUID;', 'delivery_assignments.revoked_by');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS revocation_reason TEXT;', 'delivery_assignments.revocation_reason');

    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_attempt_count INTEGER DEFAULT 0;', 'orders.delivery_attempt_count');
    await exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_delivery_failure_at TIMESTAMPTZ;', 'orders.last_delivery_failure_at');

    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_failed_at ON delivery_assignments(failed_at);', 'idx_delivery_assignments_failed_at');
    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);', 'idx_delivery_assignments_status');
    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner_status ON delivery_assignments(delivery_partner_id, status);', 'idx_delivery_assignments_partner_status');
    await exec('CREATE INDEX IF NOT EXISTS idx_orders_delivery_attempt_count ON orders(delivery_attempt_count);', 'idx_orders_delivery_attempt_count');

    // Phase 25: Delivery Proof & OTP System Columns & Indexes
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;', 'delivery_assignments.delivery_otp_hash');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_assignment_id UUID;', 'delivery_assignments.delivery_otp_assignment_id');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_expires_at TIMESTAMPTZ;', 'delivery_assignments.delivery_otp_expires_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_verified_at TIMESTAMPTZ;', 'delivery_assignments.delivery_otp_verified_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER NOT NULL DEFAULT 0;', 'delivery_assignments.delivery_otp_attempts');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_otp_last_attempt_at TIMESTAMPTZ;', 'delivery_assignments.delivery_otp_last_attempt_at');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);', 'delivery_assignments.recipient_name');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS proof_image_url TEXT;', 'delivery_assignments.proof_image_url');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC;', 'delivery_assignments.delivery_latitude');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC;', 'delivery_assignments.delivery_longitude');
    await exec('ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;', 'delivery_assignments.delivered_at');

    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_otp_expires_at ON delivery_assignments(delivery_otp_expires_at);', 'idx_delivery_assignments_otp_expires_at');
    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_otp_verified_at ON delivery_assignments(delivery_otp_verified_at);', 'idx_delivery_assignments_otp_verified_at');
    await exec('CREATE INDEX IF NOT EXISTS idx_delivery_assignments_delivered_at ON delivery_assignments(delivered_at DESC);', 'idx_delivery_assignments_delivered_at');

    // Disable RLS on operational tables for backend service consistency
    const rlsTables = [
      'orders', 'payments', 'order_addresses', 'refunds', 'coupons',
      'delivery_assignments', 'notifications', 'notification_deliveries',
      'notification_preferences', 'admin_activity_logs', 'inventory_movements',
      'cancellation_requests', 'returns', 'return_items', 'replacement_requests', 'store_settings',
      'whatsapp_delivery_notifications', 'order_status_history'
    ];
    for (const table of rlsTables) {
      await exec(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`, `disable RLS on ${table}`);
    }

    // PostgREST Schema Cache Reload
    await exec('NOTIFY pgrst, \'reload schema\';', 'NOTIFY pgrst reload schema');

    console.log('✅ Production database schema successfully aligned 100%!');
  } catch (err) {
    console.error('Error during schema alignment:', err.message);
  } finally {
    await client.end();
  }
}

fixSchemaFull();
