-- Migration 038: Delivery Failure Recovery, Reassignment & Return-to-Store Workflow
-- Idempotent schema additions for delivery failure, reassignment tracking, return-to-store, and attempt counting

-- 1. Add fields to delivery_assignments if missing
ALTER TABLE delivery_assignments
ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS failure_notes TEXT,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_to_store_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS returned_to_store_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reassignment_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- 2. Add fields to orders if missing
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_delivery_failure_at TIMESTAMPTZ;

-- 3. Add performance indexes for delivery failure and reassignment queries
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_failed_at ON delivery_assignments(failed_at);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner_status ON delivery_assignments(delivery_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_attempt_count ON orders(delivery_attempt_count);

NOTIFY pgrst, 'reload schema';
