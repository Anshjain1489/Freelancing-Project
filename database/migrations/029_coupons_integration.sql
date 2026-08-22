-- ============================================================================
-- Migration: 029_coupons_integration.sql
-- Description: Coupons table, seed initial 4 discount rules, and add coupon columns to orders
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Create Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    minimum_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (minimum_order_amount >= 0),
    discount_type VARCHAR(20) NOT NULL DEFAULT 'FIXED', -- 'FIXED' or 'PERCENTAGE'
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed Initial 4 Coupon Rules
INSERT INTO coupons (code, description, minimum_order_amount, discount_type, discount_value, is_active)
VALUES 
  ('SAVE20', '₹20 OFF on orders above ₹1,000', 1000.00, 'FIXED', 20.00, TRUE),
  ('SAVE50', '₹50 OFF on orders above ₹2,000', 2000.00, 'FIXED', 50.00, TRUE),
  ('SAVE200', '₹200 OFF on orders above ₹5,000', 5000.00, 'FIXED', 200.00, TRUE),
  ('SAVE500', '₹500 OFF on orders above ₹10,000', 10000.00, 'FIXED', 500.00, TRUE)
ON CONFLICT (code) DO UPDATE 
SET minimum_order_amount = EXCLUDED.minimum_order_amount,
    discount_value = EXCLUDED.discount_value,
    is_active = TRUE;

-- 3. Add coupon columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (discount_amount >= 0);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code);

-- 5. Enable Row Level Security (RLS) on coupons table
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 6. RLS Security Policies for coupons
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'service_role_full_access_coupons') THEN
        CREATE POLICY service_role_full_access_coupons ON coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coupons' AND policyname = 'authenticated_select_active_coupons') THEN
        CREATE POLICY authenticated_select_active_coupons ON coupons FOR SELECT TO authenticated USING (is_active = true);
    END IF;
END $$;
