-- 021_rls_policies.sql: Supabase Row Level Security (RLS) activation & policy definitions

-- Enable Row Level Security on sensitive user & transaction tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. Public Storefront Policies (Read-Only access to active products, categories, & banners)
CREATE POLICY "Public Read Active Categories" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public Read Active Products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public Read Product Images" ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "Public Read Active Banners" ON banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public Read Active Promotions" ON promotions FOR SELECT USING (is_active = TRUE);

-- 2. Customer Policies (Users can only read/write their own records)
CREATE POLICY "Customer Select Own Profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Customer Update Own Profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow Public Registration Insert" ON users FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Customer Manage Own Addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Customer Manage Own Cart" ON carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Customer Manage Own Cart Items" ON cart_items FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
);

CREATE POLICY "Customer Read Own Orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Customer Create Own Orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Customer Read Own Order Items" ON order_items FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

CREATE POLICY "Customer Read Own Notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- 3. Admin Policies (Bypass RLS for service_role or admin user role)
-- Admin role checks execute via backend service role key or admin JWT claim verification
