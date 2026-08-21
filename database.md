# Supabase PostgreSQL Database Architecture — Chaudhary Kirana Store

## 1. Overview & Relational Schema Summary

* **Database Engine:** Supabase PostgreSQL
* **Total Tables:** 32 Tables
* **Primary Key Strategy:** UUID (`gen_random_uuid()`)
* **Financial Precision:** `NUMERIC(10,2)` (no floating point rounding errors)
* **Search Engine:** PostgreSQL Full-Text Search (`tsvector` generated column & GIN index on `products`)
* **Timestamp Handling:** Centralized `update_updated_at_column()` function with 18 table triggers

---

## 2. Complete Migration Execution Sequence

1. `001_extensions.sql` — Enables `pgcrypto` & `uuid-ossp`.
2. `002_enums.sql` — Defines custom Enums (`user_role_enum`, `order_status_enum`, `payment_status_enum`, etc.).
3. `003_roles_users.sql` — Defines `roles`, `users`, and `user_roles`.
4. `004_addresses.sql` — Defines `addresses` with `latitude` and `longitude` numeric coordinates.
5. `005_categories.sql` — Defines `categories` with display order and unique slugs.
6. `006_products.sql` — Defines `products` and `product_images` with MRP & selling price check constraints.
7. `007_inventory.sql` — Defines `inventory` counters and `inventory_movements` audit ledger.
8. `008_cart.sql` — Defines `carts` and `cart_items`.
9. `009_orders.sql` — Defines `orders`, `order_addresses` (immutable snapshot), `order_items`, and `order_status_history`.
10. `010_payments.sql` — Defines `payments` (Razorpay order/payment IDs, signatures) and `payment_events` webhook audit log.
11. `011_delivery.sql` — Defines `delivery_settings` (1 KM free radius, ₹10/extra KM).
12. `012_promotions.sql` — Defines `coupons`, `coupon_usages`, `promotions`, `promotion_targets`, `banners`.
13. `013_notifications.sql` — Defines `notifications` & `notification_preferences`.
14. `014_reviews.sql` — Defines `reviews` table.
15. `015_chatbot.sql` — Defines `chatbot_conversations` & `chatbot_messages`.
16. `016_analytics.sql` — Defines `daily_sales_summary` & `sales`.
17. `017_admin_logs.sql` — Defines `admin_activity_logs`.
18. `018_functions_triggers.sql` — Reusable timestamp trigger function and 18 table triggers.
19. `019_indexes.sql` — 22 B-Tree performance indexes.
20. `020_search.sql` — Full-Text Search `tsvector` generated column & GIN index.
21. `021_rls_policies.sql` — Row Level Security policies for Customer and Admin roles.
22. `022_google_auth.sql` — `google_id` column and index for Google OAuth Sign-In.
23. `023_orders_payments_razorpay.sql` — Distance fields, payment attempt counters, unique order number index, and Razorpay lookup indexes.
24. `024_notifications_whatsapp.sql` — `notifications`, `notification_deliveries`, `notification_preferences`.
25. `025_admin_analytics_indexes.sql` — Composite range indexes on `orders`, `payments`, `order_items`, `inventory`, and `admin_activity_logs`.
26. `026_chatbot_conversations.sql` — `chatbot_conversations` and `chatbot_messages` with session and user indexing.
