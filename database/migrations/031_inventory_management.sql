-- 031_inventory_management.sql: Production Inventory & Stock Management System

-- 1. Add inventory columns to products table safely
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 50;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_alert_active BOOLEAN NOT NULL DEFAULT FALSE;

-- Populate products stock_quantity from existing inventory table if available
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
    UPDATE products p
    SET stock_quantity = COALESCE(i.quantity, p.stock_quantity),
        reserved_quantity = COALESCE(i.reserved_quantity, p.reserved_quantity),
        low_stock_threshold = COALESCE(i.low_stock_threshold, p.low_stock_threshold)
    FROM inventory i
    WHERE p.id = i.product_id;
  END IF;
END $$;

-- Add check constraints to products
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_stock_quantity_non_negative;
ALTER TABLE products ADD CONSTRAINT check_stock_quantity_non_negative CHECK (stock_quantity >= 0);

ALTER TABLE products DROP CONSTRAINT IF EXISTS check_reserved_quantity_non_negative;
ALTER TABLE products ADD CONSTRAINT check_reserved_quantity_non_negative CHECK (reserved_quantity >= 0);

ALTER TABLE products DROP CONSTRAINT IF EXISTS check_reserved_less_than_stock;
ALTER TABLE products ADD CONSTRAINT check_reserved_less_than_stock CHECK (reserved_quantity <= stock_quantity);

-- 2. Align inventory table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
    ALTER TABLE inventory ADD COLUMN IF NOT EXISTS low_stock_alert_active BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 3. Create or align inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    previous_reserved INTEGER,
    new_reserved INTEGER,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Align existing inventory_movements columns if table was created in migration 007
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_stock INTEGER;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_stock INTEGER;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS previous_reserved INTEGER;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS new_reserved INTEGER;
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Populate quantity from quantity_change if upgrading from 007 schema
UPDATE inventory_movements SET quantity = ABS(quantity_change) WHERE quantity = 0 AND quantity_change IS NOT NULL;

-- 4. Create Indexes for fast inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at DESC);

-- Unique constraint / partial index to ensure idempotent SALE movement per order and product
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_order_product_sale 
ON inventory_movements(order_id, product_id, movement_type) 
WHERE movement_type = 'SALE';

-- 5. Trigger function to keep inventory table and products table in sync (if inventory table exists)
CREATE OR REPLACE FUNCTION sync_products_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
    INSERT INTO inventory (product_id, quantity, reserved_quantity, low_stock_threshold, low_stock_alert_active, updated_at)
    VALUES (NEW.id, NEW.stock_quantity, NEW.reserved_quantity, NEW.low_stock_threshold, NEW.low_stock_alert_active, NOW())
    ON CONFLICT (product_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      reserved_quantity = EXCLUDED.reserved_quantity,
      low_stock_threshold = EXCLUDED.low_stock_threshold,
      low_stock_alert_active = EXCLUDED.low_stock_alert_active,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_products_to_inventory ON products;
CREATE TRIGGER trg_sync_products_to_inventory
AFTER INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION sync_products_to_inventory();
