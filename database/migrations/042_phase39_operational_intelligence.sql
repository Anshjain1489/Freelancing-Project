-- =============================================================================
-- MIGRATION 042: PHASE 39 OPERATIONAL INTELLIGENCE, REORDER & AUTOMATION SCHEMA
-- =============================================================================

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  lead_time_days INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Supplier Products Mapping
CREATE TABLE IF NOT EXISTS supplier_products (
  id VARCHAR(64) PRIMARY KEY,
  supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  cost_price NUMERIC(10, 2) DEFAULT 0.00,
  minimum_order_qty INT DEFAULT 1,
  is_preferred BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, product_id)
);

-- 3. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(64) PRIMARY KEY,
  po_number VARCHAR(64) UNIQUE NOT NULL,
  supplier_id VARCHAR(64) REFERENCES suppliers(id),
  status VARCHAR(30) DEFAULT 'DRAFT', -- DRAFT, APPROVED, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  total_amount NUMERIC(10, 2) DEFAULT 0.00,
  expected_delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_by VARCHAR(64),
  approved_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id VARCHAR(64) PRIMARY KEY,
  purchase_order_id VARCHAR(64) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost_price NUMERIC(10, 2) DEFAULT 0.00,
  line_total NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inventory Reorder Recommendations Table (Calculation Snapshot Reproducibility)
CREATE TABLE IF NOT EXISTS inventory_reorder_recommendations (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  current_stock INT DEFAULT 0,
  reserved_stock INT DEFAULT 0,
  available_stock INT DEFAULT 0,
  sales_qty_30d INT DEFAULT 0,
  avg_daily_sales NUMERIC(10, 2) DEFAULT 0.00,
  days_of_supply NUMERIC(10, 2) DEFAULT 0.00,
  lead_time_days INT DEFAULT 3,
  safety_stock INT DEFAULT 5,
  status_level VARCHAR(30) DEFAULT 'HEALTHY', -- HEALTHY, REORDER_SOON, CRITICAL, OUT_OF_STOCK, NO_SALES_DATA
  recommended_qty INT DEFAULT 0,
  supplier_id VARCHAR(64) REFERENCES suppliers(id),
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, DISMISSED, CONVERTED_TO_PO
  calculation_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Customer Replenishment Recommendations Table
CREATE TABLE IF NOT EXISTS customer_replenishment_recommendations (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  purchase_count INT DEFAULT 1,
  estimated_interval_days INT DEFAULT 30,
  last_purchased_at TIMESTAMPTZ,
  next_suggested_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, NOTIFIED, DISMISSED, PURCHASED
  reminder_count INT DEFAULT 0,
  last_reminded_at TIMESTAMPTZ,
  is_opted_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Automation Job Runs Table
CREATE TABLE IF NOT EXISTS automation_job_runs (
  id VARCHAR(64) PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'RUNNING', -- RUNNING, SUCCESS, FAILED
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT DEFAULT 0,
  records_processed INT DEFAULT 0,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
  id VARCHAR(64) PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Secure Invoice Sharing Tokens Table
CREATE TABLE IF NOT EXISTS invoice_sharing_tokens (
  id VARCHAR(64) PRIMARY KEY,
  token VARCHAR(128) UNIQUE NOT NULL,
  invoice_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_reorder_product ON inventory_reorder_recommendations(product_id);
CREATE INDEX IF NOT EXISTS idx_replenish_customer ON customer_replenishment_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_name ON automation_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_invoice_token ON invoice_sharing_tokens(token);
