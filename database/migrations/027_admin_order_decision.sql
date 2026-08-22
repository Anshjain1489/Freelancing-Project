-- ============================================================================
-- Migration: 027_admin_order_decision.sql
-- Description: Add REJECTED order status, decision tracking columns, and indexes
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Add REJECTED to order_status_enum safely
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'order_status_enum'::regtype 
        AND enumlabel = 'REJECTED'
    ) THEN
        ALTER TYPE order_status_enum ADD VALUE 'REJECTED';
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Add Admin Decision Columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. Create Indexes for order decision queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_accepted_by ON orders(accepted_by);
CREATE INDEX IF NOT EXISTS idx_orders_rejected_by ON orders(rejected_by);
