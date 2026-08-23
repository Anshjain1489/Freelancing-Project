-- 005_demo_data.sql: Homepage banners, coupons, and promotional campaigns

-- Sample Coupons
INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order_amount, usage_limit, usage_limit_per_user, is_active) VALUES
('SAVE50', 'Flat ₹50 OFF on orders above ₹2,000', 'FIXED', 50.00, 2000.00, 500, 1, TRUE),
('SAVE20', 'Flat ₹20 OFF on orders above ₹1,000', 'FIXED', 20.00, 1000.00, 500, 1, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Sample Banners
INSERT INTO banners (title, subtitle, image_url, target_url, display_order, is_active) VALUES
('Fresh Kirana Essentials Delivered Fast 🛒', 'FREE Delivery within 1 KM from Near Bada Jain Mandir', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', '/products', 1, TRUE),
('Monthly Ration Specials — Save up to 15% 🔥', 'Quality Atta, Basmati Rice, Oils & Spices at honest prices', 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=1200&q=80', '/offers', 2, TRUE);

-- Sample Promotions
INSERT INTO promotions (title, description, promotion_type, discount_type, discount_value, is_active) VALUES
('Kirana Savings Festival', 'Special discounts on daily essentials across Mahruni', 'FESTIVAL', 'PERCENTAGE', 10.00, TRUE);
