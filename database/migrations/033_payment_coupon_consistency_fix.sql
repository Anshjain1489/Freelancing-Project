-- Migration 033: Payment and Coupon Consistency Fix (Phase 19.2)

-- 1. Ensure orders table has coupon and razorpay payment ID columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);

-- 2. Ensure payments table has all required provider & razorpay columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(100);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'NOT_REQUIRED';

-- 3. Disable RLS on server operational tables for consistent backend access
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events DISABLE ROW LEVEL SECURITY;

-- 4. Create helpful indexes for rapid payment lookup & refund reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON public.payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON public.payments(order_id, status);

-- 5. Bidirectional Backfill: Sync provider_payment_id and razorpay_payment_id where available
UPDATE public.payments
SET provider_payment_id = razorpay_payment_id
WHERE provider_payment_id IS NULL AND razorpay_payment_id IS NOT NULL;

UPDATE public.payments
SET razorpay_payment_id = provider_payment_id
WHERE razorpay_payment_id IS NULL AND provider_payment_id IS NOT NULL;

UPDATE public.payments
SET razorpay_order_id = provider_order_id
WHERE razorpay_order_id IS NULL AND provider_order_id IS NOT NULL;

-- 6. Backfill orders.razorpay_payment_id from payments table
UPDATE public.orders o
SET razorpay_payment_id = p.razorpay_payment_id
FROM public.payments p
WHERE o.id = p.order_id 
  AND o.razorpay_payment_id IS NULL 
  AND p.razorpay_payment_id IS NOT NULL;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
