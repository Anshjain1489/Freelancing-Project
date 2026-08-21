-- 002_categories.sql: 12 Kirana store categories

INSERT INTO categories (id, name, slug, description, icon_name, display_order, is_active) VALUES
('c1010000-0000-0000-0000-000000000001', 'Atta & Grains', 'atta-grains', 'Fresh chakki wheat flour, maida, sooji, besan, and whole grains', 'Wheat', 1, TRUE),
('c1010000-0000-0000-0000-000000000002', 'Rice & Pulses', 'rice-pulses', 'Premium Basmati rice, Sona Masoori, Toor Dal, Moong, Chana, and Rajma', 'Utensils', 2, TRUE),
('c1010000-0000-0000-0000-000000000003', 'Oil & Ghee', 'oil-ghee', 'Pure Mustard oil, Refined Sunflower oil, Groundnut oil, and Desi Cow Ghee', 'Droplet', 3, TRUE),
('c1010000-0000-0000-0000-000000000004', 'Spices', 'spices', 'Whole & powdered spices, Haldi, Mirch, Dhaniya, Garam Masala, and Hing', 'Flame', 4, TRUE),
('c1010000-0000-0000-0000-000000000005', 'Dairy', 'dairy', 'Fresh milk, paneer, curd, butter, and cheese', 'Milk', 5, TRUE),
('c1010000-0000-0000-0000-000000000006', 'Snacks', 'snacks', 'Namkeen, Bhujia, Chips, Kurkure, and Roasted Chana', 'Cookie', 6, TRUE),
('c1010000-0000-0000-0000-000000000007', 'Biscuits', 'biscuits', 'Glucose, Marie, Cream biscuits, Rusks, and Cookies', 'Coffee', 7, TRUE),
('c1010000-0000-0000-0000-000000000008', 'Beverages', 'beverages', 'Tea powder, Coffee, Cold drinks, Juices, and Energy drinks', 'CupSoda', 8, TRUE),
('c1010000-0000-0000-0000-000000000009', 'Personal Care', 'personal-care', 'Bathing soaps, Shampoos, Toothpaste, Oils, and Creams', 'Smile', 9, TRUE),
('c1010000-0000-0000-0000-000000000010', 'Cleaning & Household', 'cleaning-household', 'Detergent powders, Dishwash bars, Floor cleaners, and Phenyl', 'Sparkles', 10, TRUE),
('c1010000-0000-0000-0000-000000000011', 'Instant Food', 'instant-food', 'Noodles, Pasta, Soups, Ready mixes, and Breakfast cereals', 'Zap', 11, TRUE),
('c1010000-0000-0000-0000-000000000012', 'Daily Essentials', 'daily-essentials', 'Tata Salt, Sugar, Jaggery, Pooja items, and Matches', 'PackageCheck', 12, TRUE)
ON CONFLICT (slug) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
icon_name = EXCLUDED.icon_name,
display_order = EXCLUDED.display_order;
