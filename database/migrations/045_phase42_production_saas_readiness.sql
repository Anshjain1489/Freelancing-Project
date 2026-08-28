-- Migration 045: Phase 42 Production SaaS Readiness, White-Labeling & Operations
-- Enables multi-tenant organization/store models, dynamic store branding, key-value settings, feature flags, import jobs, and subscription licensing.

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    legal_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    store_code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Store Branding Table
CREATE TABLE IF NOT EXISTS store_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL DEFAULT 'Chaudhary Kirana Store',
    logo_url TEXT DEFAULT '/assets/logo.png',
    favicon_url TEXT DEFAULT '/favicon.ico',
    primary_color VARCHAR(20) DEFAULT '#06C167',
    secondary_color VARCHAR(20) DEFAULT '#1F2937',
    accent_color VARCHAR(20) DEFAULT '#FF6B00',
    website_title VARCHAR(255) DEFAULT 'Chaudhary Kirana Store — Fresh Groceries & Daily Needs',
    meta_description TEXT DEFAULT 'Order fresh groceries, staples, dairy, personal care, and household items online from Chaudhary Kirana Store in Mahruni.',
    support_email VARCHAR(255) DEFAULT 'support@chaudharykiranastore.com',
    support_phone VARCHAR(50) DEFAULT '+91 7897837095',
    footer_text TEXT DEFAULT '© 2026 Chaudhary Kirana Store. All rights reserved. Near Bada Jain Mandir, Tikamgarh Road, Mahruni.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Store Settings Table (Upgrade existing table if present from migration 032)
CREATE TABLE IF NOT EXISTS store_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure multi-tenant & SaaS columns exist in store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS setting_key VARCHAR(100);
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS setting_value JSONB;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Store Feature Flags Junction Table
CREATE TABLE IF NOT EXISTS store_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Import Jobs Table
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- PRODUCTS, SUPPLIERS, CATEGORIES
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, VALIDATING, PROCESSING, COMPLETED, FAILED, PARTIALLY_COMPLETED
    total_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,
    error_report JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 8. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- STARTER, BUSINESS, PROFESSIONAL, ENTERPRISE
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    max_stores INT DEFAULT 1,
    max_products INT DEFAULT 10000,
    max_users INT DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Organization Subscriptions Table
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, TRIAL, PAST_DUE, CANCELLED, EXPIRED
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. License Audit Logs Table
CREATE TABLE IF NOT EXISTS license_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast tenant configuration lookups
CREATE INDEX IF NOT EXISTS idx_stores_org_id ON stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_store_branding_store_id ON store_branding(store_id);
CREATE INDEX IF NOT EXISTS idx_store_feature_flags_store ON store_feature_flags(store_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_store ON import_jobs(store_id);

-- Seed Default Organization, Store & Initial Config
DO $$
DECLARE
    default_org_id UUID := '00000000-0000-0000-0000-000000000001';
    default_store_id UUID := '00000000-0000-0000-0000-000000000002';
    starter_plan_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- Seed Organization
    INSERT INTO organizations (id, name, slug, legal_name, status, subscription_status)
    VALUES (default_org_id, 'Chaudhary Kirana Store', 'chaudhary-kirana', 'Chaudhary Kirana Private Limited', 'ACTIVE', 'ACTIVE')
    ON CONFLICT (slug) DO NOTHING;

    -- Seed Store
    INSERT INTO stores (id, organization_id, name, store_code, email, phone, address, city, state, postal_code, latitude, longitude, timezone, currency, is_active)
    VALUES (
        default_store_id,
        default_org_id,
        'Chaudhary Kirana Store',
        'CKS-MAIN',
        'contact@chaudharykiranastore.com',
        '7897837095',
        'Near Bada Jain Mandir, Tikamgarh Road, Mahruni',
        'Mahruni',
        'Uttar Pradesh',
        '284405',
        24.2381,
        78.7364,
        'Asia/Kolkata',
        'INR',
        TRUE
    ) ON CONFLICT (store_code) DO NOTHING;

    -- Seed Store Branding
    INSERT INTO store_branding (id, store_id, store_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, website_title, meta_description, support_email, support_phone, footer_text)
    VALUES (
        gen_random_uuid(),
        default_store_id,
        'Chaudhary Kirana Store',
        '/assets/logo.png',
        '/favicon.ico',
        '#06C167',
        '#1F2937',
        '#FF6B00',
        'Chaudhary Kirana Store — Fresh Groceries & Daily Needs',
        'Order fresh groceries, staples, dairy, personal care, and household items online from Chaudhary Kirana Store in Mahruni.',
        'support@chaudharykiranastore.com',
        '+91 7897837095',
        '© 2026 Chaudhary Kirana Store. All rights reserved. Near Bada Jain Mandir, Tikamgarh Road, Mahruni.'
    ) ON CONFLICT (store_id) DO NOTHING;

    -- Seed Store Settings
    INSERT INTO store_settings (key, value, store_id, setting_key, setting_value, is_sensitive)
    VALUES
        ('delivery_enabled', 'true', default_store_id, 'delivery_enabled', 'true'::jsonb, FALSE),
        ('pos_enabled', 'true', default_store_id, 'pos_enabled', 'true'::jsonb, FALSE),
        ('online_orders_enabled', 'true', default_store_id, 'online_orders_enabled', 'true'::jsonb, FALSE),
        ('guest_checkout_enabled', 'true', default_store_id, 'guest_checkout_enabled', 'true'::jsonb, FALSE),
        ('whatsapp_notifications_enabled', 'false', default_store_id, 'whatsapp_notifications_enabled', 'false'::jsonb, FALSE),
        ('inventory_alerts_enabled', 'true', default_store_id, 'inventory_alerts_enabled', 'true'::jsonb, FALSE),
        ('financial_module_enabled', 'true', default_store_id, 'financial_module_enabled', 'true'::jsonb, FALSE),
        ('maintenance_mode', 'false', default_store_id, 'maintenance_mode', 'false'::jsonb, FALSE),
        ('minimum_order_amount', '99.00', default_store_id, 'minimum_order_amount', '99.00'::jsonb, FALSE),
        ('tax_inclusive_pricing', 'true', default_store_id, 'tax_inclusive_pricing', 'true'::jsonb, FALSE)
    ON CONFLICT DO NOTHING;

    -- Seed Feature Flags
    INSERT INTO feature_flags (key, description, default_enabled) VALUES
        ('ENABLE_POS', 'Point of Sale counter billing module', TRUE),
        ('ENABLE_DELIVERY', 'Delivery fleet management & distance calculations', TRUE),
        ('ENABLE_PROCUREMENT', 'Purchase orders, goods receiving & WAC costing', TRUE),
        ('ENABLE_FINANCE', 'Expenses, payables, cash sessions & P&L reports', TRUE),
        ('ENABLE_ANALYTICS', 'Executive BI charts & GST tax slab reporting', TRUE),
        ('ENABLE_CHATBOT', 'AI Assistant Chatbot integration', TRUE),
        ('ENABLE_PROMOTIONS', 'Coupons, discounts & promotional banners', TRUE),
        ('ENABLE_RETURNS', 'Customer returns and pre-dispatch cancellations', TRUE)
    ON CONFLICT (key) DO NOTHING;

    -- Seed Store Feature Flag Junction
    INSERT INTO store_feature_flags (store_id, feature_flag_id, is_enabled)
    SELECT default_store_id, id, TRUE FROM feature_flags
    ON CONFLICT DO NOTHING;

    -- Seed Subscription Plans
    INSERT INTO subscription_plans (id, code, name, description, price_monthly, max_stores, max_products, max_users)
    VALUES (starter_plan_id, 'ENTERPRISE', 'Kirana Enterprise Plan', 'Full Kirana Store Management, POS, Procurement, Finance & AI', 0.00, 10, 100000, 100)
    ON CONFLICT (code) DO NOTHING;

    -- Seed Subscription
    INSERT INTO organization_subscriptions (organization_id, plan_id, status)
    VALUES (default_org_id, starter_plan_id, 'ACTIVE')
    ON CONFLICT DO NOTHING;
END $$;
