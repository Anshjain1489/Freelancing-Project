# Page Blueprint & Sitemap — Chaudhary Kirana Store

## 1. Summary of Application Pages (40 Pages)

The platform consists of **40 distinct view pages** grouped into Public Storefront, Customer Account Portal, Authentication, and Admin Store Operations.

---

## 2. Public Storefront Pages

| # | Page Name | Route Path | Layout Wrapper | Description & Primary Actions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Home** | `/` | `MainLayout` | Hero banner, category grid, daily offers, promo video, store location & contact details. |
| 2 | **Products Catalog** | `/products` | `MainLayout` | Browse all products, category filters, sorting, price range filters. |
| 3 | **Product Details** | `/products/:slug` | `MainLayout` | High-res product images, MRP/selling price, stock availability, unit breakdown, Add to Cart. |
| 4 | **Categories List** | `/categories` | `MainLayout` | Visual grid of 12+ Kirana categories with custom icons. |
| 5 | **Search Products** | `/search` | `MainLayout` | Instant debounced search bar with recent searches and recommendations. |
| 6 | **Offers & Deals** | `/offers` | `MainLayout` | Daily discounts, festival promo bundles, active coupon codes. |
| 7 | **Cart View** | `/cart` | `MainLayout` | Full-page cart summary, quantity adjustments, itemized subtotal, delivery calculator preview. |
| 8 | **Checkout** | `/checkout` | `MainLayout` | Address picker, distance calculation, delivery charge calculation, Razorpay & COD selection. |
| 9 | **Order Confirmation**| `/order-success/:orderId`| `MainLayout` | Celebratory confetti screen, order summary, order status timeline initialization. |
| 10 | **Order Tracking** | `/track/:orderNumber` | `MainLayout` | Live order timeline status lookup by order number. |
| 11 | **About Store** | `/about` | `MainLayout` | Chaudhary Kirana Store story, Akash Chaudhary owner profile, Mahruni community trust. |
| 12 | **Contact Store** | `/contact` | `MainLayout` | Phone links (+91 7897837095), Google Maps location, opening hours, contact form. |
| 13 | **Privacy Policy** | `/privacy` | `MainLayout` | Data privacy details, payment security assurances, customer data handling rules. |
| 14 | **Terms & Conditions**| `/terms` | `MainLayout` | Terms of service, return/cancellation policies, delivery terms. |

---

## 3. Authentication Pages

| # | Page Name | Route Path | Layout Wrapper | Description & Primary Actions |
| :--- | :--- | :--- | :--- | :--- |
| 15 | **Customer Login** | `/login` | `AuthLayout` | Mobile/Email & password login form with toggle to register. |
| 16 | **Customer Register**| `/register` | `AuthLayout` | Customer registration form (Name, Phone, Email, Password). |
| 17 | **Forgot Password** | `/forgot-password` | `AuthLayout` | Request password reset verification link/OTP. |
| 18 | **Reset Password** | `/reset-password` | `AuthLayout` | Set new password with confirmation input. |

---

## 4. Customer Portal Pages (Protected: Customer Role)

| # | Page Name | Route Path | Layout Wrapper | Description & Primary Actions |
| :--- | :--- | :--- | :--- | :--- |
| 19 | **Profile Overview** | `/account/profile` | `CustomerLayout` | Manage personal info, phone number, email, and password. |
| 20 | **My Orders** | `/account/orders` | `CustomerLayout` | Filter active and historical orders with status badges. |
| 21 | **Order Details** | `/account/orders/:id`| `CustomerLayout` | Detailed invoice, line items, address, payment receipt, re-order button. |
| 22 | **Saved Addresses** | `/account/addresses` | `CustomerLayout` | Add, edit, remove delivery addresses in Mahruni and nearby zones. |
| 23 | **Notifications** | `/account/notifications`| `CustomerLayout` | Customer in-app notification center history. |

---

## 5. Admin Portal Pages (Protected: Admin Role)

| # | Page Name | Route Path | Layout Wrapper | Description & Primary Actions |
| :--- | :--- | :--- | :--- | :--- |
| 24 | **Admin Dashboard** | `/admin` | `AdminLayout` | Overview cards (Sales today, Orders pending, Low stock alert count). |
| 25 | **Product List** | `/admin/products` | `AdminLayout` | Manage products table with quick search, stock edit, and active toggle. |
| 26 | **Add Product** | `/admin/products/new`| `AdminLayout` | Form to create a new product (Category, MRP, Selling Price, Unit, Images, Stock). |
| 27 | **Edit Product** | `/admin/products/edit/:id`| `AdminLayout` | Update existing product details and pricing. |
| 28 | **Category Manager** | `/admin/categories` | `AdminLayout` | Add/Edit categories, order sorting, icon assignment. |
| 29 | **Inventory Manager**| `/admin/inventory` | `AdminLayout` | Stock quantity editor, low-stock threshold triggers, out-of-stock highlights. |
| 30 | **Order Management** | `/admin/orders` | `AdminLayout` | Manage incoming orders, confirm availability, update status transitions. |
| 31 | **Order Detail Admin**| `/admin/orders/:id` | `AdminLayout` | Deep-dive invoice view, update payment status, trigger WhatsApp message manually. |
| 32 | **Customer List** | `/admin/customers` | `AdminLayout` | List registered customers, total orders count, total spend, active status. |
| 33 | **Payment Logs** | `/admin/payments` | `AdminLayout` | Audit Razorpay transaction IDs, HMAC signatures, payment status logs. |
| 34 | **Sales Reports** | `/admin/sales` | `AdminLayout` | Revenue charts, daily summaries, date range filters (Today, 7 days, 30 days, Custom). |
| 35 | **Business Analytics**| `/admin/analytics` | `AdminLayout` | AOV trends, top-selling items, slow-moving items, category sales distribution. |
| 36 | **Coupon Manager** | `/admin/coupons` | `AdminLayout` | Create and manage discount codes, validity dates, minimum order values. |
| 37 | **Promotions Manager**| `/admin/promotions` | `AdminLayout` | Configure festival deals, homepage banner text overlays, promo badges. |
| 38 | **Banner Manager** | `/admin/banners` | `AdminLayout` | Upload homepage carousel slides, banner links, active status toggles. |
| 39 | **Notification Admin**| `/admin/notifications`| `AdminLayout` | Send broadcast notifications to customers. |
| 40 | **Store Settings** | `/admin/settings` | `AdminLayout` | Configure free delivery radius, charge per extra KM, store contact numbers, store hours. |
