-- ============================================================================
-- Migration: 023_orders_payments_razorpay.sql
-- Description: Add unique constraints, distance columns, and index helpers for Razorpay Payment & Order Pipeline
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- Ensure delivery_distance_km exists on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(5,2) DEFAULT 0.00;

-- Ensure payment_attempts exists on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempts INT DEFAULT 0;

-- Ensure payment_verified_at exists on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

-- Ensure payment_failure_reason exists on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

-- Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
