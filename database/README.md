# Database Setup & Migrations — Chaudhary Kirana Store

This directory contains Supabase-compatible PostgreSQL DDL migration scripts and realistic Kirana store seed files for **Chaudhary Kirana Store**.

---

## 📋 Prerequisites
- A running Supabase PostgreSQL database instance (or local PostgreSQL 14+ database).
- Access to Supabase SQL Editor or standard `psql` command-line utility.

---

## 🗄 Migration Execution Order

Run migration files sequentially from `database/migrations/`:

1. `001_extensions.sql` — Enables `pgcrypto` & `uuid-ossp`.
2. `002_enums.sql` — Creates custom Enums (`user_role_enum`, `order_status_enum`, `payment_status_enum`, `payment_method_enum`, etc.).
3. `003_roles_users.sql` — Creates `roles`, `users`, `user_roles` tables.
4. `004_addresses.sql` — Creates `addresses` table with coordinates support.
5. `005_categories.sql` — Creates `categories` table.
6. `006_products.sql` — Creates `products` & `product_images` tables.
7. `007_inventory.sql` — Creates `inventory` & `inventory_movements` tables.
8. `008_cart.sql` — Creates `carts` & `cart_items` tables.
9. `009_orders.sql` — Creates `orders`, `order_addresses` (immutable snapshot), `order_items`, & `order_status_history` tables.
10. `010_payments.sql` — Creates `payments` & `payment_events` tables.
11. `011_delivery.sql` — Creates `delivery_settings` table.
12. `012_promotions.sql` — Creates `coupons`, `coupon_usages`, `promotions`, `promotion_targets`, & `banners` tables.
13. `013_notifications.sql` — Creates `notifications` & `notification_preferences` tables.
14. `014_reviews.sql` — Creates `reviews` table.
15. `015_chatbot.sql` — Creates `chatbot_conversations` & `chatbot_messages` tables.
16. `016_analytics.sql` — Creates `daily_sales_summary` & `sales` tables.
17. `017_admin_logs.sql` — Creates `admin_activity_logs` table.
18. `018_functions_triggers.sql` — Creates reusable `update_updated_at_column()` function and table triggers.
19. `019_indexes.sql` — Creates performance B-Tree indexes across all high-frequency query fields.
20. `020_search.sql` — Creates Full-Text Search `tsvector` generated column & GIN index on products.
21. `021_rls_policies.sql` — Configures Supabase Row Level Security (RLS) policies.

---

## 🌾 Seed Data Execution Order

Run seed files from `database/seeds/` after migrations are applied:

1. `001_roles.sql` — Inserts `CUSTOMER` and `ADMIN` roles.
2. `002_categories.sql` — Seeds 12 Kirana store categories (Atta & Grains, Oil & Ghee, Spices, Dairy, etc.).
3. `003_products.sql` — Seeds **32 realistic Indian Kirana products** and matching inventory counts.
4. `004_delivery_settings.sql` — Seeds Mahruni store coordinates and delivery parameters (Free radius 1 KM, ₹10/extra KM).
5. `005_demo_data.sql` — Seeds homepage hero banners, coupons (`WELCOME10`, `MAHRUNI50`), and promo deals.

---

## 🔒 Security & Important Notes
- **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in frontend code or public repositories.
- Use parameterized queries via `@supabase/supabase-js` to prevent SQL injection vulnerabilities.
- Production schema changes should always be applied using tracked migration scripts.
