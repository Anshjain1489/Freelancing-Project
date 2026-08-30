-- Migration: 047_phase45_crm_marketing_retention.sql
-- Description: Phase 45 Enterprise Customer Growth, CRM, Marketing Automation & Retention Intelligence Schema

-- 1. Customer Profiles Table
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    customer_code VARCHAR(32) UNIQUE NOT NULL,
    first_order_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    completed_orders INTEGER DEFAULT 0 CHECK (completed_orders >= 0),
    total_spend NUMERIC(12,2) DEFAULT 0.00 CHECK (total_spend >= 0),
    average_order_value NUMERIC(12,2) DEFAULT 0.00 CHECK (average_order_value >= 0),
    customer_lifetime_value NUMERIC(12,2) DEFAULT 0.00 CHECK (customer_lifetime_value >= 0),
    rfm_score VARCHAR(16) DEFAULT 'R1F1M1',
    customer_segment VARCHAR(64) DEFAULT 'NEW_CUSTOMER',
    is_marketing_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Customer Segments Table
CREATE TABLE IF NOT EXISTS customer_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    description TEXT,
    criteria JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Segment Members Table
CREATE TABLE IF NOT EXISTS customer_segment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_segment_user UNIQUE (segment_id, user_id)
);

-- 4. Customer Engagement Events Table
CREATE TABLE IF NOT EXISTS customer_engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(128),
    event_type VARCHAR(64) NOT NULL,
    product_id UUID,
    order_id UUID,
    campaign_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(64) DEFAULT 'PROMOTIONAL',
    channel VARCHAR(32) DEFAULT 'IN_APP',
    status VARCHAR(32) DEFAULT 'DRAFT',
    subject VARCHAR(255),
    message_template TEXT NOT NULL,
    image_url TEXT,
    coupon_id UUID,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Marketing Campaign Audiences Table
CREATE TABLE IF NOT EXISTS marketing_campaign_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES customer_segments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Marketing Campaign Deliveries Table
CREATE TABLE IF NOT EXISTS marketing_campaign_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(32) DEFAULT 'IN_APP',
    status VARCHAR(32) DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_campaign_customer UNIQUE (campaign_id, customer_id)
);

-- 8. Abandoned Carts Table
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    cart_value NUMERIC(12,2) DEFAULT 0.00,
    item_count INTEGER DEFAULT 0,
    recovery_status VARCHAR(32) DEFAULT 'DETECTED',
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,
    recovered_order_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE,
    referrer_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    qualified_order_id UUID,
    status VARCHAR(32) DEFAULT 'PENDING',
    reward_amount NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    qualified_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 11. Referral Reward Ledger Table
CREATE TABLE IF NOT EXISTS referral_reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_type VARCHAR(32) DEFAULT 'LOYALTY_POINTS',
    points INTEGER DEFAULT 0,
    cash_value NUMERIC(12,2) DEFAULT 0.00,
    direction VARCHAR(16) DEFAULT 'CREDIT',
    reason TEXT,
    reference_id VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_segment ON customer_profiles(customer_segment);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_rfm ON customer_profiles(rfm_score);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_last_order ON customer_profiles(last_order_at);

CREATE INDEX IF NOT EXISTS idx_customer_segments_slug ON customer_segments(slug);

CREATE INDEX IF NOT EXISTS idx_segment_members_user ON customer_segment_members(user_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON customer_segment_members(segment_id);

CREATE INDEX IF NOT EXISTS idx_engagement_events_user ON customer_engagement_events(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON customer_engagement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_events_created ON customer_engagement_events(created_at);
CREATE INDEX IF NOT EXISTS idx_engagement_events_campaign ON customer_engagement_events(campaign_id);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_starts ON marketing_campaigns(starts_at);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_ends ON marketing_campaigns(ends_at);

CREATE INDEX IF NOT EXISTS idx_campaign_audiences_campaign ON marketing_campaign_audiences(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign ON marketing_campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_customer ON marketing_campaign_deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_status ON marketing_campaign_deliveries(status);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cart ON abandoned_carts(cart_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(recovery_status);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);

-- Enable RLS
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_reward_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow customer access to own data, service/admin full access)
DROP POLICY IF EXISTS customer_profiles_self ON customer_profiles;
CREATE POLICY customer_profiles_self ON customer_profiles FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS customer_segment_members_self ON customer_segment_members;
CREATE POLICY customer_segment_members_self ON customer_segment_members FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS engagement_events_self ON customer_engagement_events;
CREATE POLICY engagement_events_self ON customer_engagement_events FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS campaign_deliveries_self ON marketing_campaign_deliveries;
CREATE POLICY campaign_deliveries_self ON marketing_campaign_deliveries FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS referral_codes_self ON referral_codes;
CREATE POLICY referral_codes_self ON referral_codes FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS referrals_self ON referrals;
CREATE POLICY referrals_self ON referrals FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS referral_reward_self ON referral_reward_ledger;
CREATE POLICY referral_reward_self ON referral_reward_ledger FOR SELECT USING (user_id = auth.uid());

-- Initial Seed System Segments
INSERT INTO customer_segments (name, slug, description, criteria, is_system) VALUES
('New Customers', 'NEW_CUSTOMER', 'Customers with 0 or 1 completed order', '{"maximum_orders": 1}'::jsonb, true),
('Active Customers', 'ACTIVE_CUSTOMER', 'Customers who purchased within the last 30 days', '{"inactive_days": 30}'::jsonb, true),
('Repeat Customers', 'REPEAT_CUSTOMER', 'Customers with 2 or more completed orders', '{"minimum_orders": 2}'::jsonb, true),
('High Value VIPs', 'HIGH_VALUE', 'Customers with total spend >= ₹10,000', '{"minimum_spend": 10000}'::jsonb, true),
('At Risk Customers', 'AT_RISK', 'Inactive between 30 and 60 days', '{"min_inactive_days": 30, "max_inactive_days": 60}'::jsonb, true),
('Inactive Customers', 'INACTIVE', 'No purchase for over 60 days', '{"min_inactive_days": 60}'::jsonb, true),
('Subscription Members', 'SUBSCRIPTION_CUSTOMER', 'Customers with active grocery subscriptions', '{"has_active_subscription": true}'::jsonb, true),
('Loyalty Members', 'LOYALTY_CUSTOMER', 'Customers actively earning or redeeming loyalty points', '{"has_loyalty_points": true}'::jsonb, true),
('Udhar Khata Users', 'UDHAR_CUSTOMER', 'Customers with store credit Khata accounts', '{"has_store_credit": true}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;
