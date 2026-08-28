-- =============================================================================
-- MIGRATION 043: PHASE 40 PROCUREMENT, VALUATION & ADVANCED INVENTORY MANAGEMENT
-- =============================================================================

-- 1. Extend Suppliers Table
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(30) DEFAULT 'COD',
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT NULL;

-- 2. Operational Source of Truth for Weighted-Average Costing in Inventory
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS average_cost_price NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS inventory_value_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Extend Purchase Orders Table
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_invoice_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(64),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 4. Extend Purchase Order Items Table
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS quantity_damaged INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_missing INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- 5. Immutable Stock Adjustments Table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL,
  reason VARCHAR(50) NOT NULL, -- DAMAGE, EXPIRY, THEFT_LOSS, MANUAL_CORRECTION
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_loss_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  reverses_adjustment_id VARCHAR(64) REFERENCES stock_adjustments(id),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventory Cost History Audit Log Table
CREATE TABLE IF NOT EXISTS inventory_cost_history (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  old_cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  new_cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  change_source VARCHAR(50) NOT NULL, -- PO_RECEIPT, MANUAL_ADJUSTMENT, INITIAL_SET
  reference_id VARCHAR(64),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Order Status History Table
CREATE TABLE IF NOT EXISTS purchase_order_status_history (
  id VARCHAR(64) PRIMARY KEY,
  purchase_order_id VARCHAR(64) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(64),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & audit filtering
CREATE INDEX IF NOT EXISTS idx_stock_adj_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_cost_hist_product ON inventory_cost_history(product_id);
CREATE INDEX IF NOT EXISTS idx_po_status_hist_po ON purchase_order_status_history(purchase_order_id);
