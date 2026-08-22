-- 032_returns_cancellations.sql: Production Order Cancellation, Return & Replacement Management System

-- 1. Create cancellation_requests table
CREATE TABLE IF NOT EXISTS cancellation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    request_reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED'
      CHECK (status IN ('NOT_REQUESTED', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index to prevent duplicate active cancellation requests for the same order
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_cancellation_request 
ON cancellation_requests(order_id) 
WHERE status = 'REQUESTED';

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_order ON cancellation_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user ON cancellation_requests(requested_by);

-- 2. Create returns table
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    return_number VARCHAR(100) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED'
      CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'REFUND_PROCESSING', 'REFUNDED', 'FAILED')),
    reason TEXT NOT NULL,
    customer_description TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    pickup_required BOOLEAN DEFAULT TRUE,
    pickup_delivery_partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    picked_up_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    refund_status VARCHAR(50) DEFAULT 'NOT_INITIATED',
    refund_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index to prevent duplicate active returns for the same order
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_return_request
ON returns(order_id)
WHERE status IN ('REQUESTED', 'APPROVED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'REFUND_PROCESSING');

CREATE INDEX IF NOT EXISTS idx_returns_order ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_partner ON returns(pickup_delivery_partner_id);

-- 3. Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    condition_status VARCHAR(50) DEFAULT 'RESTOCKABLE' CHECK (condition_status IN ('RESTOCKABLE', 'DAMAGED')),
    approved_quantity INTEGER DEFAULT 0 CHECK (approved_quantity >= 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
    refund_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (refund_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON return_items(product_id);

-- 4. Create replacement_requests table
CREATE TABLE IF NOT EXISTS replacement_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED'
      CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REPLACEMENT_PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    replacement_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_replacement_request
ON replacement_requests(order_id)
WHERE status IN ('REQUESTED', 'APPROVED', 'REPLACEMENT_PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY');

CREATE INDEX IF NOT EXISTS idx_replacement_requests_order ON replacement_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_replacement_requests_user ON replacement_requests(user_id);

-- 5. Store Settings Table (Policy Configurations)
CREATE TABLE IF NOT EXISTS store_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO store_settings (key, value, description)
VALUES 
  ('return_window_days', '7', 'Configurable return window in days after delivery'),
  ('replacement_window_days', '7', 'Configurable replacement window in days after delivery'),
  ('allow_return_after_delivery', 'true', 'Whether returns are allowed after delivery'),
  ('allow_partial_return', 'true', 'Whether partial item returns are allowed')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE replacement_requests ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cancellation_requests' AND policyname = 'service_role_full_access_canc') THEN
        CREATE POLICY service_role_full_access_canc ON cancellation_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'returns' AND policyname = 'service_role_full_access_ret') THEN
        CREATE POLICY service_role_full_access_ret ON returns FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'return_items' AND policyname = 'service_role_full_access_ret_items') THEN
        CREATE POLICY service_role_full_access_ret_items ON return_items FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'replacement_requests' AND policyname = 'service_role_full_access_repl') THEN
        CREATE POLICY service_role_full_access_repl ON replacement_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
