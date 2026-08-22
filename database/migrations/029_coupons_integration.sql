-- ============================================================================
-- Migration: 029_coupons_integration.sql
-- Description: Coupons table, seed initial discount rules, add coupon columns to orders & reload PostgREST schema cache
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Create Coupons Table if not exists
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

-- 2. Seed Initial Coupon Rules (Phase 15 + default rules)
INSERT INTO coupons (code, description, minimum_order_amount, discount_type, discount_value, is_active)
VALUES 
  ('SAVE20', '₹20 OFF on orders above ₹1,000', 1000.00, 'FIXED', 20.00, TRUE),
  ('SAVE50', '₹50 OFF on orders above ₹2,000', 2000.00, 'FIXED', 50.00, TRUE),
  ('SAVE200', '₹200 OFF on orders above ₹5,000', 5000.00, 'FIXED', 200.00, TRUE),
  ('SAVE500', '₹500 OFF on orders above ₹10,000', 10000.00, 'FIXED', 500.00, TRUE),
  ('WELCOME10', '10% OFF on your first grocery order in Mahruni', 200.00, 'PERCENTAGE', 10.00, TRUE),
  ('MAHRUNI50', 'Flat ₹50 OFF on monthly ration orders above ₹999', 999.00, 'FIXED', 50.00, TRUE)
ON CONFLICT (code) DO UPDATE 
SET description = EXCLUDED.description,
    minimum_order_amount = EXCLUDED.minimum_order_amount,
    discount_value = EXCLUDED.discount_value,
    is_active = TRUE;

-- 3. Add coupon columns to orders table safely
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;

-- 4. Ensure discount_amount is defaulted properly and historical rows set to 0 if null
UPDATE public.orders SET discount_amount = 0.00 WHERE discount_amount IS NULL;
ALTER TABLE public.orders ALTER COLUMN discount_amount SET DEFAULT 0.00;

-- 5. Add foreign key relationship for coupon_id safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_coupon_id_fkey'
    ) THEN
        ALTER TABLE public.orders
        ADD CONSTRAINT orders_coupon_id_fkey
        FOREIGN KEY (coupon_id)
        REFERENCES public.coupons(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Create performance indexes safely
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON orders(coupon_id);

-- 7. Disable RLS on coupons table for backend service consistency
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;

-- 8. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
