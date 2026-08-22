-- ============================================================================
-- Migration: 030_delivery_management.sql
-- Description: Delivery Partner role, delivery_assignments table, unique constraints & indexes
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- 1. Ensure DELIVERY_PARTNER role exists in roles table
INSERT INTO roles (name, description)
VALUES ('DELIVERY_PARTNER', 'Delivery Fleet Partner')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Delivery Assignments Table
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    delivery_partner_id UUID NOT NULL REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED'
      CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'CANCELLED')),
    
    estimated_ready_at TIMESTAMPTZ,
    estimated_delivery_at TIMESTAMPTZ,
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    failure_reason TEXT,
    delivery_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner ON delivery_assignments(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_order ON delivery_assignments(order_id);

-- 4. Enable Row Level Security
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Security Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_assignments' AND policyname = 'service_role_full_access_delivery') THEN
        CREATE POLICY service_role_full_access_delivery ON delivery_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_assignments' AND policyname = 'partner_own_assignments') THEN
        CREATE POLICY partner_own_assignments ON delivery_assignments FOR SELECT TO authenticated USING (delivery_partner_id = auth.uid());
    END IF;
END $$;
