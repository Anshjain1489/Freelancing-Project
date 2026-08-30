-- ============================================================================
-- MIGRATION 050: PHASE 46 — PRODUCTION TIERED COUPON CATALOG EXPANSION
-- Description: Idempotently inserts 4 new production tiered coupons (SAVE1000, SAVE2000, SAVE5000, SAVE10000)
--              without modifying, renaming, or deleting any existing coupons.
-- ============================================================================

-- Ensure unique index exists on LOWER(code) for conflict handling
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower ON public.coupons (LOWER(code));

-- Seed 4 new tiered production coupons
INSERT INTO public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  minimum_order_amount,
  maximum_discount_amount,
  is_active,
  starts_at
)
VALUES 
  ('SAVE1000',  '₹10 OFF on orders above ₹1,000',  'FIXED',  10.00,  1000.00,  10.00, TRUE, NOW()),
  ('SAVE2000',  '₹50 OFF on orders above ₹2,000',  'FIXED',  50.00,  2000.00,  50.00, TRUE, NOW()),
  ('SAVE5000',  '₹100 OFF on orders above ₹5,000', 'FIXED', 100.00,  5000.00, 100.00, TRUE, NOW()),
  ('SAVE10000', '₹200 OFF on orders above ₹10,000', 'FIXED', 200.00, 10000.00, 200.00, TRUE, NOW())
ON CONFLICT (LOWER(code)) DO NOTHING;

-- Notify PostgREST schema cache reload if applicable
NOTIFY pgrst, 'reload schema';
