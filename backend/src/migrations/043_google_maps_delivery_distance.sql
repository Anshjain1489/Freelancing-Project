-- Migration 043: Google Maps Delivery Distance & Store Coordinates Configuration

-- 1. Add latitude, longitude, delivery_distance_km, estimated_delivery_charge, distance_calculated_at to addresses table
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS delivery_distance_km NUMERIC(8, 2);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS estimated_delivery_charge NUMERIC(10, 2);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS distance_calculated_at TIMESTAMPTZ;

-- 2. Add distance_km snapshot column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2);

-- 3. Create delivery_settings table
CREATE TABLE IF NOT EXISTS delivery_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  store_name VARCHAR(255) NOT NULL DEFAULT 'Chaudhary Kirana Store',
  store_address TEXT NOT NULL DEFAULT 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh, India',
  store_latitude NUMERIC(10, 7) NOT NULL DEFAULT 24.2381000,
  store_longitude NUMERIC(10, 7) NOT NULL DEFAULT 78.7364000,
  charge_per_km NUMERIC(8, 2) NOT NULL DEFAULT 10.00,
  minimum_delivery_charge NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  maximum_delivery_radius_km NUMERIC(8, 2) NOT NULL DEFAULT 50.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default store location delivery settings
INSERT INTO delivery_settings (id, store_name, store_address, store_latitude, store_longitude, charge_per_km, minimum_delivery_charge, maximum_delivery_radius_km, is_active)
VALUES ('default', 'Chaudhary Kirana Store', 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh, India', 24.2381000, 78.7364000, 10.00, 0.00, 50.00, true)
ON CONFLICT (id) DO UPDATE SET
  charge_per_km = 10.00,
  minimum_delivery_charge = 0.00;
