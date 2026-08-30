-- Phase 46 Migration: Remove Dairy Category and Associated Products
-- Deactivates Dairy category and associated perishable milk/paneer products.

UPDATE categories 
SET is_active = false, updated_at = NOW() 
WHERE slug = 'dairy' OR lower(name) LIKE '%dairy%';

UPDATE products 
SET is_active = false, updated_at = NOW() 
WHERE category_id IN (SELECT id FROM categories WHERE slug = 'dairy');
