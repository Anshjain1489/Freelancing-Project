-- ====================================================================
-- CHAUDHARY KIRANA STORE - PHASE 44 MIGRATION
-- Migration Name: 046_phase44_enterprise_loyalty_credit_multistore.sql
-- Description: Multi-Store SaaS, Customer Udhar Khata (Credit), Loyalty Subsystem & Grocery Subscriptions
-- ====================================================================

-- 1. Store Branches Table (Multi-Store Support)
CREATE TABLE IF NOT EXISTS public.store_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Mahruni',
    state VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    postal_code VARCHAR(20) NOT NULL DEFAULT '284401',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{"delivery_radius_km": 10, "free_delivery_min_order": 500}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default Main Store Branch if none exists
INSERT INTO public.store_branches (branch_code, branch_name, address, city, state, postal_code, latitude, longitude, phone, is_active)
VALUES ('CKS-MAIN', 'Chaudhary Kirana Store - Main Branch', 'Main Market, Mahruni', 'Mahruni', 'Uttar Pradesh', '284401', 24.5800, 78.4800, '+917897837095', true)
ON CONFLICT (branch_code) DO NOTHING;

-- 2. Customer Store Credit Accounts (Udhar Khata)
CREATE TABLE IF NOT EXISTS public.customer_store_credit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    branch_id UUID REFERENCES public.store_branches(id) ON DELETE SET NULL,
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (credit_limit >= 0),
    outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (outstanding_balance >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Append-Only Store Credit Ledger Transactions
CREATE TABLE IF NOT EXISTS public.store_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_account_id UUID NOT NULL REFERENCES public.customer_store_credit(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount <> 0),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('DEBIT_PURCHASE', 'CREDIT_REPAYMENT', 'ADJUSTMENT', 'REVERSAL')),
    reference_id VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Customer Loyalty Accounts
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    branch_id UUID REFERENCES public.store_branches(id) ON DELETE SET NULL,
    points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier VARCHAR(20) NOT NULL DEFAULT 'SILVER' CHECK (tier IN ('SILVER', 'GOLD', 'PLATINUM')),
    tier_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Append-Only Loyalty Points Ledger
CREATE TABLE IF NOT EXISTS public.loyalty_points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_account_id UUID NOT NULL REFERENCES public.loyalty_accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL CHECK (points <> 0),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('EARN', 'REDEEM', 'BONUS', 'ADJUSTMENT', 'REVERSAL')),
    reference_id VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Recurring Grocery Subscriptions
CREATE TABLE IF NOT EXISTS public.grocery_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.store_branches(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'ALTERNATE_DAYS', 'MONTHLY')),
    next_delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'SKIPPED')),
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Subscription Execution Dispatches (Idempotent tracking)
CREATE TABLE IF NOT EXISTS public.subscription_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.grocery_subscriptions(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    execution_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (execution_status IN ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED')),
    generated_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_subscription_scheduled_date UNIQUE (subscription_id, scheduled_date)
);

-- 8. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_store_branches_code ON public.store_branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_store_branches_active ON public.store_branches(is_active);
CREATE INDEX IF NOT EXISTS idx_customer_store_credit_user ON public.customer_store_credit(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_store_credit_status ON public.customer_store_credit(status);
CREATE INDEX IF NOT EXISTS idx_store_credit_tx_account ON public.store_credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_store_credit_tx_user ON public.store_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user ON public.loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_tier ON public.loyalty_accounts(tier);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_account ON public.loyalty_points_ledger(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_grocery_subs_user ON public.grocery_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_subs_status ON public.grocery_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_grocery_subs_next_date ON public.grocery_subscriptions(next_delivery_date);
CREATE INDEX IF NOT EXISTS idx_sub_dispatches_date ON public.subscription_dispatches(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sub_dispatches_sub_date ON public.subscription_dispatches(subscription_id, scheduled_date);

-- 9. Row Level Security (RLS) Policies
ALTER TABLE public.store_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_store_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_dispatches ENABLE ROW LEVEL SECURITY;

-- Public / Authenticated read for active store branches
DROP POLICY IF EXISTS public_read_branches ON public.store_branches;
CREATE POLICY public_read_branches ON public.store_branches FOR SELECT USING (is_active = true);

-- Admin Full Management Policies
DROP POLICY IF EXISTS admin_manage_branches ON public.store_branches;
CREATE POLICY admin_manage_branches ON public.store_branches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_store_credit ON public.customer_store_credit;
CREATE POLICY admin_manage_store_credit ON public.customer_store_credit FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_credit_tx ON public.store_credit_transactions;
CREATE POLICY admin_manage_credit_tx ON public.store_credit_transactions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_loyalty ON public.loyalty_accounts;
CREATE POLICY admin_manage_loyalty ON public.loyalty_accounts FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_loyalty_ledger ON public.loyalty_points_ledger;
CREATE POLICY admin_manage_loyalty_ledger ON public.loyalty_points_ledger FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_subscriptions ON public.grocery_subscriptions;
CREATE POLICY admin_manage_subscriptions ON public.grocery_subscriptions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS admin_manage_sub_dispatches ON public.subscription_dispatches;
CREATE POLICY admin_manage_sub_dispatches ON public.subscription_dispatches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Customer RLS Isolation Policies
DROP POLICY IF EXISTS customer_own_store_credit ON public.customer_store_credit;
CREATE POLICY customer_own_store_credit ON public.customer_store_credit FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_own_credit_tx ON public.store_credit_transactions;
CREATE POLICY customer_own_credit_tx ON public.store_credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_own_loyalty ON public.loyalty_accounts;
CREATE POLICY customer_own_loyalty ON public.loyalty_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_own_loyalty_ledger ON public.loyalty_points_ledger;
CREATE POLICY customer_own_loyalty_ledger ON public.loyalty_points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_own_subscriptions ON public.grocery_subscriptions;
CREATE POLICY customer_own_subscriptions ON public.grocery_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_own_sub_dispatches ON public.subscription_dispatches;
CREATE POLICY customer_own_sub_dispatches ON public.subscription_dispatches FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.grocery_subscriptions WHERE grocery_subscriptions.id = subscription_dispatches.subscription_id AND grocery_subscriptions.user_id = auth.uid())
);
