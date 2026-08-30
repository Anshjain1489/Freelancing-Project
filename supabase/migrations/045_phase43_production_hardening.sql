-- ====================================================================
-- CHAUDHARY KIRANA STORE - PHASE 43 PRODUCTION HARDENING MIGRATION
-- Migration Name: 045_phase43_production_hardening.sql
-- ====================================================================

-- 1. Schema Migration History Tracking Table
CREATE TABLE IF NOT EXISTS public.schema_migration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    execution_duration_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    executed_by VARCHAR(255) DEFAULT 'SYSTEM_MIGRATOR',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for migration lookup speed
CREATE INDEX IF NOT EXISTS idx_schema_migration_history_name ON public.schema_migration_history(migration_name);
CREATE INDEX IF NOT EXISTS idx_schema_migration_history_executed ON public.schema_migration_history(executed_at);

-- 2. System Alerts & Production Monitoring Log Table
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'WARNING', -- 'INFO', 'WARNING', 'CRITICAL'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON public.system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON public.system_alerts(created_at);

-- 3. Enable Row Level Security (RLS) on new production tables
ALTER TABLE public.schema_migration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Admin-Only Management Policies
DROP POLICY IF EXISTS admin_schema_migration_history_policy ON public.schema_migration_history;
CREATE POLICY admin_schema_migration_history_policy ON public.schema_migration_history
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS admin_system_alerts_policy ON public.system_alerts;
CREATE POLICY admin_system_alerts_policy ON public.system_alerts
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );
