-- ============================================================================
-- Migration: 025_admin_analytics_indexes.sql
-- Description: Indexes for fast Admin Dashboard & Business Intelligence Analytics aggregation
-- Author: Akash Chaudhary (Chaudhary Kirana Store)
-- ============================================================================

-- Fast range indexes for orders and payments analytics
CREATE INDEX IF NOT EXISTS idx_orders_analytics ON orders(created_at, status, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_analytics ON payments(created_at, status);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id, quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_product_qty ON inventory(product_id, quantity);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON admin_activity_logs(created_at, action);
