-- 020_search.sql: Full-Text Search tsvector column & GIN index for instant Kirana product search

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
    to_tsvector('english', 
        coalesce(name, '') || ' ' || 
        coalesce(brand, '') || ' ' || 
        coalesce(short_description, '') || ' ' || 
        coalesce(description, '')
    )
) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);
