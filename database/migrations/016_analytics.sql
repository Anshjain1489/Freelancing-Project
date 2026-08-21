-- 016_analytics.sql: Daily Sales Summaries and Detailed Sales Reporting tables

CREATE TABLE IF NOT EXISTS daily_sales_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    summary_date DATE UNIQUE NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
    completed_orders INTEGER NOT NULL DEFAULT 0 CHECK (completed_orders >= 0),
    cancelled_orders INTEGER NOT NULL DEFAULT 0 CHECK (cancelled_orders >= 0),
    total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_revenue >= 0),
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_discount >= 0),
    total_delivery_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_delivery_revenue >= 0),
    average_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (average_order_value >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    revenue NUMERIC(10, 2) NOT NULL CHECK (revenue >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
