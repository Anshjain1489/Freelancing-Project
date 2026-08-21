-- 011_delivery.sql: Store Delivery Settings table

CREATE TABLE IF NOT EXISTS delivery_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(100) DEFAULT 'Chaudhary Kirana Store',
    store_latitude NUMERIC(10, 7) NOT NULL DEFAULT 24.2381,
    store_longitude NUMERIC(10, 7) NOT NULL DEFAULT 78.7364,
    free_delivery_radius_km NUMERIC(4, 2) NOT NULL DEFAULT 1.0 CHECK (free_delivery_radius_km >= 0),
    charge_per_extra_km NUMERIC(6, 2) NOT NULL DEFAULT 10.00 CHECK (charge_per_extra_km >= 0),
    maximum_delivery_radius_km NUMERIC(4, 2) NOT NULL DEFAULT 15.0 CHECK (maximum_delivery_radius_km >= free_delivery_radius_km),
    minimum_order_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (minimum_order_amount >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
