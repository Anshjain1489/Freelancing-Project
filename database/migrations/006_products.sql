-- 006_products.sql: Products and Product Images tables

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(100) DEFAULT 'Generic',
    unit VARCHAR(20) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'litre', 'ml', 'packet', 'piece')),
    unit_value NUMERIC(10, 2) NOT NULL DEFAULT 1.0 CHECK (unit_value > 0),
    mrp NUMERIC(10, 2) NOT NULL CHECK (mrp >= 0),
    selling_price NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0 AND selling_price <= mrp),
    discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    tax_percentage NUMERIC(5, 2) DEFAULT 0.00 CHECK (tax_percentage >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(200),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
