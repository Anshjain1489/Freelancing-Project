-- ============================================================================
-- MIGRATION 049: PHASE 46 — CATALOG CLEANUP & COUPON MANAGEMENT
-- Description: Deactivates Dairy products (except Ghee) and enhances Coupons & Usages schema.
-- ============================================================================

-- 1. Extend Coupons Table with Enterprise Parameters
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS maximum_discount_amount NUMERIC(10, 2) DEFAULT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_limit_per_user INTEGER DEFAULT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- Ensure constraints on coupons
DO $$
BEGIN
    -- Check discount_type constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupons_discount_type') THEN
        ALTER TABLE public.coupons ADD CONSTRAINT chk_coupons_discount_type CHECK (discount_type IN ('PERCENTAGE', 'FIXED'));
    END IF;

    -- Check minimum_order_amount constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupons_min_order') THEN
        ALTER TABLE public.coupons ADD CONSTRAINT chk_coupons_min_order CHECK (minimum_order_amount >= 0);
    END IF;
END $$;

-- Case-insensitive unique index for coupon code
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower ON public.coupons (LOWER(code));

-- 2. Create Coupon Usages Table
CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_coupon_order UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON public.coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_order ON public.coupon_usages(order_id);

-- Disable RLS on operational coupon tables
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages DISABLE ROW LEVEL SECURITY;

-- 3. Dairy Product Catalog Cleanup
-- Deactivate all Dairy products EXCEPT Ghee
UPDATE public.products
SET is_active = FALSE, updated_at = NOW()
WHERE (
  category_id IN (SELECT id FROM public.categories WHERE LOWER(name) LIKE '%dairy%')
  OR LOWER(name) LIKE '%milk%'
  OR LOWER(name) LIKE '%curd%'
  OR LOWER(name) LIKE '%paneer%'
  OR LOWER(name) LIKE '%butter%'
  OR LOWER(name) LIKE '%cheese%'
  OR LOWER(name) LIKE '%buttermilk%'
  OR LOWER(name) LIKE '%lassi%'
)
AND LOWER(name) NOT LIKE '%ghee%'
AND LOWER(name) NOT LIKE '%cookie%'
AND LOWER(name) NOT LIKE '%shampoo%'
AND LOWER(name) NOT LIKE '%soap%';

-- Explicitly ensure Ghee remains ACTIVE and accessible
UPDATE public.products
SET is_active = TRUE, updated_at = NOW()
WHERE LOWER(name) LIKE '%ghee%' OR sku = 'SKU-GHE-001';

-- Seed default commercial coupons if not present
INSERT INTO public.coupons (code, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, usage_limit, usage_limit_per_user, is_active)
VALUES 
  ('SAVE10', '10% OFF on orders above ₹500', 'PERCENTAGE', 10.00, 500.00, 100.00, 100, 1, TRUE),
  ('WELCOME100', 'Flat ₹100 OFF on orders above ₹999', 'FIXED', 100.00, 999.00, 100.00, 50, 1, TRUE),
  ('KIRANA50', 'Flat ₹50 OFF on orders above ₹499', 'FIXED', 50.00, 499.00, 50.00, 200, 2, TRUE)
ON CONFLICT DO NOTHING;

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
