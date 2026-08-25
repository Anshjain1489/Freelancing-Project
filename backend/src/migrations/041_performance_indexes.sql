-- Migration 041: Add Performance Indexes for High Traffic Endpoints & Search Optimization

-- 1. Index for customer order list & tracking filter (user_id, status)
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- 2. Index for admin dashboard order list sorting & status filtering (status, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- 3. Index for delivery partner active assignment lookups (delivery_partner_id, status)
CREATE INDEX IF NOT EXISTS idx_delivery_assignment_partner_status ON delivery_assignments(delivery_partner_id, status);

-- 4. Index for public catalog browsing & active category filtering (category_id, is_active)
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);

-- 5. Index for payment verification & order lookup (order_id, status)
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON payments(order_id, status);
