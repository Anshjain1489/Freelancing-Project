-- ============================================================================
-- Migration: 028_refunds_integration.sql
-- Description: Refunds table with UNIQUE(order_id) constraint, refund_status columns, indexes, and RLS security policies
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Create Refunds Table with UNIQUE order_id constraint
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    razorpay_refund_id VARCHAR(100) UNIQUE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'NOT_INITIATED', -- NOT_REQUIRED, NOT_INITIATED, PROCESSING, COMPLETED, FAILED
    reason TEXT,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure UNIQUE(order_id) constraint exists if table was created previously
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_refund_per_order'
    ) THEN
        ALTER TABLE refunds ADD CONSTRAINT unique_refund_per_order UNIQUE (order_id);
    END IF;
END $$;

-- 2. Add refund_status to orders and payments tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NOT_REQUIRED';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NOT_REQUIRED';

-- 3. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON refunds(razorpay_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_orders_refund_status ON orders(refund_status);
CREATE INDEX IF NOT EXISTS idx_payments_refund_status ON payments(refund_status);

-- 4. Enable Row Level Security (RLS) on refunds table
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- 5. RLS Security Policies for refunds table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'service_role_full_access_refunds') THEN
        CREATE POLICY service_role_full_access_refunds ON refunds FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'admin_select_refunds') THEN
        CREATE POLICY admin_select_refunds ON refunds FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'refunds' AND policyname = 'customer_select_own_refunds') THEN
        CREATE POLICY customer_select_own_refunds ON refunds FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = refunds.order_id AND orders.user_id = auth.uid()));
    END IF;
END $$;
