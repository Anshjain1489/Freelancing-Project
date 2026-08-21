-- 003_products.sql: Seed 32 realistic Indian grocery products and inventory stock

-- Products Seed
INSERT INTO products (id, category_id, name, slug, short_description, description, sku, brand, unit, unit_value, mrp, selling_price, discount_percentage, is_featured, is_active) VALUES
-- Atta & Grains
('a1000000-0000-0000-0000-000000000001', 'c1010000-0000-0000-0000-000000000001', 'Aashirvaad Shuddh Chakki Atta 5kg', 'aashirvaad-shuddh-chakki-atta-5kg', '100% Pure Whole Wheat Chakki Atta', 'Aashirvaad Whole Wheat Atta is made from the choicest grains.', 'SKU-ATT-001', 'Aashirvaad', 'kg', 5.0, 260.00, 235.00, 10, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000002', 'c1010000-0000-0000-0000-000000000001', 'Fortune Maida 1kg', 'fortune-maida-1kg', 'Refined Wheat Flour for baking & snacks', 'High quality refined wheat flour ideal for samosas and bakes.', 'SKU-ATT-002', 'Fortune', 'kg', 1.0, 48.00, 42.00, 12, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000003', 'c1010000-0000-0000-0000-000000000001', 'Rajdhani Sooji 500g', 'rajdhani-sooji-500g', 'Clean and crispy Semolina for Halwa & Upma', 'Coarse semolina packed with nutrition.', 'SKU-ATT-003', 'Rajdhani', 'g', 500.0, 32.00, 28.00, 12, FALSE, TRUE),

-- Rice & Pulses
('a1000000-0000-0000-0000-000000000004', 'c1010000-0000-0000-0000-000000000002', 'India Gate Basmati Rice Feast Rozzana 5kg', 'india-gate-basmati-rice-5kg', 'Long grain aromatic Basmati Rice', 'Ideal for daily meals and biryanis.', 'SKU-RIC-001', 'India Gate', 'kg', 5.0, 495.00, 425.00, 14, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000005', 'c1010000-0000-0000-0000-000000000002', 'Tata Sampann Unpolished Toor Dal 1kg', 'tata-sampann-toor-dal-1kg', 'Rich in protein unpolished Arhar Dal', 'Cleaned and unpolished premium pulses.', 'SKU-PUL-001', 'Tata Sampann', 'kg', 1.0, 175.00, 155.00, 11, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000006', 'c1010000-0000-0000-0000-000000000002', 'Tata Sampann Moong Dal Dhuli 1kg', 'tata-sampann-moong-dal-1kg', 'High protein Yellow Moong Dal', 'Easy to digest unpolished Moong dal.', 'SKU-PUL-002', 'Tata Sampann', 'kg', 1.0, 145.00, 130.00, 10, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000007', 'c1010000-0000-0000-0000-000000000002', 'Kabuli Chana 1kg', 'kabuli-chana-1kg', 'Large size white Chickpeas for Chole', 'Superior quality large white chickpeas.', 'SKU-PUL-003', 'Local Kirana', 'kg', 1.0, 160.00, 140.00, 12, FALSE, TRUE),

-- Oil & Ghee
('a1000000-0000-0000-0000-000000000008', 'c1010000-0000-0000-0000-000000000003', 'Fortune Sunlite Refined Sunflower Oil 1L', 'fortune-sunlite-sunflower-oil-1l', 'Light and healthy cooking oil', 'Enriched with Vitamin A and D.', 'SKU-OIL-001', 'Fortune', 'litre', 1.0, 165.00, 142.00, 14, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000009', 'c1010000-0000-0000-0000-000000000003', 'Engine Kachi Ghani Mustard Oil 1L', 'engine-kachi-ghani-mustard-oil-1l', 'Traditional cold pressed Mustard Oil', 'Strong aroma pungent mustard oil.', 'SKU-OIL-002', 'Engine', 'litre', 1.0, 170.00, 148.00, 13, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000010', 'c1010000-0000-0000-0000-000000000003', 'Amul Pure Cow Ghee 1L Tin', 'amul-pure-cow-ghee-1l', 'Aromatic pure Cow Ghee', 'Granular texture and rich aroma.', 'SKU-GHE-001', 'Amul', 'litre', 1.0, 650.00, 595.00, 8, TRUE, TRUE),

-- Spices
('a1000000-0000-0000-0000-000000000011', 'c1010000-0000-0000-0000-000000000004', 'Catch Turmeric Powder (Haldi) 200g', 'catch-turmeric-powder-200g', 'Pure ground Haldi with high curcumin', 'Vibrant color and authentic flavor.', 'SKU-SPI-001', 'Catch', 'g', 200.0, 48.00, 40.00, 16, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000012', 'c1010000-0000-0000-0000-000000000004', 'MDH Deggi Mirch Powder 100g', 'mdh-deggi-mirch-100g', 'Piquant red chili powder for rich color', 'Blend of Kashmiri and red chilis.', 'SKU-SPI-002', 'MDH', 'g', 100.0, 92.00, 82.00, 11, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000013', 'c1010000-0000-0000-0000-000000000004', 'MDH Garam Masala 100g', 'mdh-garam-masala-100g', 'Aromatic blend of Indian spices', 'Adds rich warmth to curries.', 'SKU-SPI-003', 'MDH', 'g', 100.0, 110.00, 98.00, 11, FALSE, TRUE),

-- Dairy
('a1000000-0000-0000-0000-000000000014', 'c1010000-0000-0000-0000-000000000005', 'Amul Taaza Toned Milk 500ml Pouch', 'amul-taaza-toned-milk-500ml', 'Pasteurised Toned Milk', 'Fresh daily milk pouch.', 'SKU-DAR-001', 'Amul', 'ml', 500.0, 28.00, 27.00, 3, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000015', 'c1010000-0000-0000-0000-000000000005', 'Amul Fresh Paneer 200g Pack', 'amul-fresh-paneer-200g', 'Soft and creamy Cottage Cheese', 'Rich in protein fresh paneer.', 'SKU-DAR-002', 'Amul', 'g', 200.0, 95.00, 88.00, 7, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000016', 'c1010000-0000-0000-0000-000000000005', 'Amul Butter 100g', 'amul-butter-100g', 'Utterly Butterly Delicious Salted Butter', 'India favourite butter.', 'SKU-DAR-003', 'Amul', 'g', 100.0, 58.00, 56.00, 3, FALSE, TRUE),

-- Snacks & Biscuits
('a1000000-0000-0000-0000-000000000017', 'c1010000-0000-0000-0000-000000000006', 'Haldiram Aloo Bhujia 400g', 'haldiram-aloo-bhujia-400g', 'Crispy potato mint bhujia snack', 'Classic Indian tea time crunchy snack.', 'SKU-SNK-001', 'Haldiram', 'g', 400.0, 115.00, 99.00, 14, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000018', 'c1010000-0000-0000-0000-000000000006', 'Kurkure Masala Munch 90g', 'kurkure-masala-munch-90g', 'Spicy crunchy corn snack', 'Irresistible chatpata flavor.', 'SKU-SNK-002', 'Kurkure', 'g', 90.0, 20.00, 18.00, 10, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000019', 'c1010000-0000-0000-0000-000000000007', 'Parle-G Gold Glucose Biscuits 1kg', 'parle-g-gold-biscuits-1kg', 'The world favourite glucose biscuit', 'Energy filled wholesome biscuits.', 'SKU-BIS-001', 'Parle', 'kg', 1.0, 140.00, 125.00, 11, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000020', 'c1010000-0000-0000-0000-000000000007', 'Britannia Good Day Cashew Biscuits 600g', 'britannia-good-day-cashew-600g', 'Rich buttery biscuits with real cashew', 'Smile with Good Day crunchy cookies.', 'SKU-BIS-002', 'Britannia', 'g', 600.0, 150.00, 130.00, 13, FALSE, TRUE),

-- Beverages
('a1000000-0000-0000-0000-000000000021', 'c1010000-0000-0000-0000-000000000008', 'Tata Tea Premium 500g Pack', 'tata-tea-premium-500g', 'Desh Ki Chai with rich aroma', 'Blend of large and small tea grains.', 'SKU-BEV-001', 'Tata Tea', 'g', 500.0, 260.00, 225.00, 13, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000022', 'c1010000-0000-0000-0000-000000000008', 'Nescafe Classic Instant Coffee 50g Glass Jar', 'nescafe-classic-coffee-50g', '100% pure instant coffee powder', 'Rich coffee aroma for instant brew.', 'SKU-BEV-002', 'Nescafe', 'g', 50.0, 185.00, 168.00, 9, FALSE, TRUE),

-- Personal Care
('a1000000-0000-0000-0000-000000000023', 'c1010000-0000-0000-0000-000000000009', 'Dettol Original Bathing Soap (125g x 3 Multipack)', 'dettol-original-soap-multipack', 'Germ protection bathing soap', 'Trusted germ protection for family.', 'SKU-PER-001', 'Dettol', 'packet', 1.0, 162.00, 142.00, 12, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000024', 'c1010000-0000-0000-0000-000000000009', 'Colgate Strong Teeth Toothpaste 200g', 'colgate-strong-teeth-200g', 'Calcium boosted toothpaste', 'Strengthens teeth from root.', 'SKU-PER-002', 'Colgate', 'g', 200.0, 110.00, 95.00, 13, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000025', 'c1010000-0000-0000-0000-000000000009', 'Clinic Plus Strong & Long Shampoo 340ml', 'clinic-plus-shampoo-340ml', 'Milk protein shampoo for strong hair', 'Nourishes hair from root to tip.', 'SKU-PER-003', 'Clinic Plus', 'ml', 340.0, 215.00, 185.00, 14, FALSE, TRUE),

-- Cleaning & Household
('a1000000-0000-0000-0000-000000000026', 'c1010000-0000-0000-0000-000000000010', 'Surf Excel Easy Wash Detergent Powder 1kg', 'surf-excel-easy-wash-1kg', 'Tough stain removal powder', 'Removes tough stains effortlessly.', 'SKU-CLE-001', 'Surf Excel', 'kg', 1.0, 145.00, 130.00, 10, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000027', 'c1010000-0000-0000-0000-000000000010', 'Vim Dishwash Bar 300g Pack of 2', 'vim-dishwash-bar-300g-pack', 'Power of 100 lemons grease cleaner', 'Degreases vessels efficiently.', 'SKU-CLE-002', 'Vim', 'g', 600.0, 60.00, 52.00, 13, FALSE, TRUE),

-- Instant Food
('a1000000-0000-0000-0000-000000000028', 'c1010000-0000-0000-0000-000000000011', 'Maggi 2-Minute Masala Instant Noodles 420g (Pack of 6)', 'maggi-masala-noodles-pack-of-6', 'Classic masala instant noodles', 'India favourite 2-minute snack.', 'SKU-INS-001', 'Maggi', 'packet', 1.0, 84.00, 78.00, 7, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000029', 'c1010000-0000-0000-0000-000000000011', 'Sunfeast YiPPee! Magic Masala Noodles 240g', 'yippee-magic-masala-noodles-240g', 'Non-sticky tasty instant noodles', 'Goodness of wheat with spicy taste.', 'SKU-INS-002', 'YiPPee', 'g', 240.0, 48.00, 43.00, 10, FALSE, TRUE),

-- Daily Essentials
('a1000000-0000-0000-0000-000000000030', 'c1010000-0000-0000-0000-000000000012', 'Tata Salt Vacuum Evaporated Iodized Salt 1kg', 'tata-salt-iodized-1kg', 'Desh Ka Namak with essential iodine', 'Purity guaranteed refined iodized salt.', 'SKU-ESS-001', 'Tata Salt', 'kg', 1.0, 28.00, 25.00, 11, TRUE, TRUE),
('a1000000-0000-0000-0000-000000000031', 'c1010000-0000-0000-0000-000000000012', 'Uttam Sugar Pure Refined Sugar 1kg', 'uttam-sugar-pure-1kg', 'Clean sulfurless refined white sugar', 'High purity crystal sugar.', 'SKU-ESS-002', 'Uttam', 'kg', 1.0, 48.00, 44.00, 8, FALSE, TRUE),
('a1000000-0000-0000-0000-000000000032', 'c1010000-0000-0000-0000-000000000012', 'Cycle Pure Agarbatti Sugandhim 250g', 'cycle-pure-agarbatti-250g', 'Aromatic Incense sticks for Pooja', 'Pure floral fragrance for daily devotion.', 'SKU-ESS-003', 'Cycle Pure', 'g', 250.0, 85.00, 75.00, 12, FALSE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
selling_price = EXCLUDED.selling_price,
mrp = EXCLUDED.mrp,
is_active = EXCLUDED.is_active;

-- Inventory Seed corresponding to all 32 products
INSERT INTO inventory (product_id, quantity, reserved_quantity, low_stock_threshold, reorder_level) VALUES
('a1000000-0000-0000-0000-000000000001', 40, 0, 5, 10),
('a1000000-0000-0000-0000-000000000002', 30, 0, 5, 10),
('a1000000-0000-0000-0000-000000000003', 25, 0, 5, 10),
('a1000000-0000-0000-0000-000000000004', 50, 0, 8, 15),
('a1000000-0000-0000-0000-000000000005', 35, 0, 5, 10),
('a1000000-0000-0000-0000-000000000006', 20, 0, 4, 8),
('a1000000-0000-0000-0000-000000000007', 18, 0, 4, 8),
('a1000000-0000-0000-0000-000000000008', 45, 0, 8, 15),
('a1000000-0000-0000-0000-000000000009', 38, 0, 6, 12),
('a1000000-0000-0000-0000-000000000010', 15, 0, 3, 6),
('a1000000-0000-0000-0000-000000000011', 60, 0, 10, 20),
('a1000000-0000-0000-0000-000000000012', 40, 0, 8, 15),
('a1000000-0000-0000-0000-000000000013', 35, 0, 5, 10),
('a1000000-0000-0000-0000-000000000014', 50, 0, 10, 20),
('a1000000-0000-0000-0000-000000000015', 25, 0, 5, 10),
('a1000000-0000-0000-0000-000000000016', 30, 0, 6, 12),
('a1000000-0000-0000-0000-000000000017', 40, 0, 8, 15),
('a1000000-0000-0000-0000-000000000018', 55, 0, 10, 20),
('a1000000-0000-0000-0000-000000000019', 35, 0, 5, 10),
('a1000000-0000-0000-0000-000000000020', 30, 0, 5, 10),
('a1000000-0000-0000-0000-000000000021', 40, 0, 6, 12),
('a1000000-0000-0000-0000-000000000022', 20, 0, 4, 8),
('a1000000-0000-0000-0000-000000000023', 35, 0, 5, 10),
('a1000000-0000-0000-0000-000000000024', 45, 0, 8, 15),
('a1000000-0000-0000-0000-000000000025', 25, 0, 4, 8),
('a1000000-0000-0000-0000-000000000026', 30, 0, 5, 10),
('a1000000-0000-0000-0000-000000000027', 40, 0, 6, 12),
('a1000000-0000-0000-0000-000000000028', 70, 0, 12, 25),
('a1000000-0000-0000-0000-000000000029', 50, 0, 10, 20),
('a1000000-0000-0000-0000-000000000030', 80, 0, 15, 30),
('a1000000-0000-0000-0000-000000000031', 65, 0, 10, 25),
('a1000000-0000-0000-0000-000000000032', 30, 0, 5, 10)
ON CONFLICT (product_id) DO UPDATE SET
quantity = EXCLUDED.quantity;
