-- 004_addresses.sql: Customer delivery addresses

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) DEFAULT 'Home',
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    landmark TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Mahruni',
    state VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    postal_code VARCHAR(10) NOT NULL DEFAULT '284405',
    latitude NUMERIC(10, 7) DEFAULT 24.2381,
    longitude NUMERIC(10, 7) DEFAULT 78.7364,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
