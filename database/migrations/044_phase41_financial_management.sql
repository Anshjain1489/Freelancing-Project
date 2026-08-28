-- =============================================================================
-- MIGRATION 044: PHASE 41 FINANCIAL ACCOUNTING, EXPENSES, CASH & PROFITABILITY
-- =============================================================================

-- 1. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default expense categories
INSERT INTO expense_categories (id, name, description) VALUES
  ('cat-exp-rent', 'Shop Rent', 'Monthly commercial store lease & rent'),
  ('cat-exp-electricity', 'Electricity', 'Power bill and electric energy costs'),
  ('cat-exp-water', 'Water & Utilities', 'Water bills and municipal utilities'),
  ('cat-exp-internet', 'Internet & Phone', 'Broadband internet and telecom expenses'),
  ('cat-exp-salary', 'Employee Salary', 'Staff wages, bonuses, and salary payments'),
  ('cat-exp-delivery', 'Delivery Expenses', 'Fleet fuel, partner payouts, and delivery costs'),
  ('cat-exp-packaging', 'Packaging Materials', 'Bags, boxes, tape, and packing supplies'),
  ('cat-exp-transport', 'Transportation & Freight', 'Logistics, goods transport, and freight fees'),
  ('cat-exp-maintenance', 'Maintenance & Repairs', 'Store upkeep, shelf repairs, and equipment service'),
  ('cat-exp-marketing', 'Marketing & Ads', 'Local flyers, digital ads, and store promotion'),
  ('cat-exp-misc', 'Miscellaneous', 'General unclassified operational expenses')
ON CONFLICT (name) DO NOTHING;

-- 2. Expenses Table (Auditable, Append-only Reversals)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  expense_number VARCHAR(50) UNIQUE NOT NULL,
  category_id VARCHAR(64) REFERENCES expense_categories(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'CASH',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  vendor_name VARCHAR(150),
  reference_number VARCHAR(100),
  receipt_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVERSED')),
  reverses_expense_id VARCHAR(64) REFERENCES expenses(id),
  reversed_by VARCHAR(64),
  reversal_reason TEXT,
  created_by VARCHAR(64),
  approved_by VARCHAR(64),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Recurring Expenses Table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category_id VARCHAR(64) REFERENCES expense_categories(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(30) DEFAULT 'CASH',
  frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
  next_due_date DATE NOT NULL,
  vendor_name VARCHAR(150),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Supplier Invoices Table (Accounts Payable)
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id VARCHAR(64) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_amount NUMERIC(10, 2) NOT NULL CHECK (invoice_amount >= 0),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  outstanding_balance NUMERIC(10, 2) NOT NULL CHECK (outstanding_balance >= 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  notes TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Supplier Payments Table
CREATE TABLE IF NOT EXISTS supplier_payments (
  id VARCHAR(64) PRIMARY KEY,
  payment_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_invoice_id VARCHAR(64) REFERENCES supplier_invoices(id) ON DELETE RESTRICT,
  supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REVERSED')),
  reverses_payment_id VARCHAR(64) REFERENCES supplier_payments(id),
  reversal_reason TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Cash Register Sessions Table
CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id VARCHAR(64) PRIMARY KEY,
  session_number VARCHAR(50) UNIQUE NOT NULL,
  register_id VARCHAR(50) NOT NULL DEFAULT 'MAIN_POS_1',
  opened_by VARCHAR(64) NOT NULL,
  closed_by VARCHAR(64),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC(10, 2) NOT NULL CHECK (opening_cash >= 0),
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cash_sales >= 0),
  cash_in NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cash_in >= 0),
  cash_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cash_expenses >= 0),
  cash_out NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cash_out >= 0),
  manual_adjustments NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  actual_cash NUMERIC(10, 2) DEFAULT NULL,
  discrepancy NUMERIC(10, 2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database-Level Concurrency Guard: Enforce ONLY ONE active OPEN cash session per register
CREATE UNIQUE INDEX IF NOT EXISTS idx_open_cash_session ON cash_register_sessions(register_id) WHERE status = 'OPEN';

-- 7. Cash Movements Table
CREATE TABLE IF NOT EXISTS cash_movements (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('CASH_IN', 'CASH_OUT', 'CASH_SALE', 'CASH_EXPENSE', 'MANUAL_ADJUSTMENT')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id VARCHAR(64),
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Cash Reconciliations Table
CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES cash_register_sessions(id) ON DELETE CASCADE,
  expected_cash NUMERIC(10, 2) NOT NULL,
  actual_cash NUMERIC(10, 2) NOT NULL,
  discrepancy NUMERIC(10, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'MATCHED' CHECK (status IN ('MATCHED', 'DISCREPANCY_FLAGGED', 'APPROVED')),
  notes TEXT,
  reconciled_by VARCHAR(64) NOT NULL,
  reconciled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Financial Ledger Entries Table (Append-Only Audit Log)
CREATE TABLE IF NOT EXISTS financial_ledger_entries (
  id VARCHAR(64) PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  entry_type VARCHAR(40) NOT NULL CHECK (entry_type IN ('SALE', 'REFUND', 'EXPENSE', 'SUPPLIER_PAYMENT', 'INVENTORY_WRITE_OFF', 'CASH_ADJUSTMENT', 'PAYMENT_RECEIVED')),
  reference_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  payment_method VARCHAR(30) DEFAULT 'CASH',
  description TEXT NOT NULL,
  reverses_entry_id VARCHAR(64) REFERENCES financial_ledger_entries(id),
  reversed_by VARCHAR(64),
  reversal_reason TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Financial Period Summaries Table
CREATE TABLE IF NOT EXISTS financial_period_summaries (
  id VARCHAR(64) PRIMARY KEY,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC(10, 2) DEFAULT 0.00,
  gross_sales NUMERIC(10, 2) DEFAULT 0.00,
  discounts NUMERIC(10, 2) DEFAULT 0.00,
  refunds NUMERIC(10, 2) DEFAULT 0.00,
  net_sales NUMERIC(10, 2) DEFAULT 0.00,
  cogs NUMERIC(10, 2) DEFAULT 0.00,
  gross_profit NUMERIC(10, 2) DEFAULT 0.00,
  operating_expenses NUMERIC(10, 2) DEFAULT 0.00,
  net_profit NUMERIC(10, 2) DEFAULT 0.00,
  total_cash_sales NUMERIC(10, 2) DEFAULT 0.00,
  total_upi_sales NUMERIC(10, 2) DEFAULT 0.00,
  total_card_sales NUMERIC(10, 2) DEFAULT 0.00,
  total_online_sales NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Cost-at-Sale Snapshot Columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sale_cost_snapshot NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS invoice_item_cost NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE pos_sale_items ADD COLUMN IF NOT EXISTS sale_cost_snapshot NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cogs NUMERIC(10, 2) DEFAULT 0.00;

ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS cogs NUMERIC(10, 2) DEFAULT 0.00;

-- Performance & Audit Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_sup_inv_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sup_inv_status ON supplier_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sup_inv_due ON supplier_invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_sup_pay_invoice ON supplier_payments(supplier_invoice_id);

CREATE INDEX IF NOT EXISTS idx_cash_sess_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_mov_session ON cash_movements(session_id);

CREATE INDEX IF NOT EXISTS idx_ledger_type ON financial_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON financial_ledger_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON financial_ledger_entries(reference_type, reference_id);
