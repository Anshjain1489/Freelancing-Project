-- Migration 037: Delivery Partner Dashboard & Delivery Workflow Columns
-- Idempotent, backward-compatible alter table statements for delivery_assignments

ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100);
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS failure_notes TEXT;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN DEFAULT FALSE;
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected_amount NUMERIC(10,2);
ALTER TABLE delivery_assignments ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMPTZ;

-- Add performance indexes for partner dashboard queries
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner_status ON delivery_assignments(delivery_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_delivered_at ON delivery_assignments(delivered_at);

-- Refresh schema cache notification
NOTIFY pgrst, 'reload schema';
