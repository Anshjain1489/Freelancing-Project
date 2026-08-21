# Product Requirements Document (PRD) — Chaudhary Kirana Store

## 1. Executive Summary & Project Identity

**Chaudhary Kirana Store** is an ultra-fast, trustworthy local grocery e-commerce platform designed to bring modern online shopping convenience to Mahruni and nearby regions while preserving the warm trust of a local Kirana store.

### Business Details
* **Business Name:** Chaudhary Kirana Store
* **Website Owner:** Akash Chaudhary
* **Primary Phone:** +91 7897837095
* **Secondary Phone:** +91 7007550184
* **Store Address:** Near Bada Jain Mandir, Tikamgarh Road, Mahruni, UP/MP Border Region, India
* **Service Slogan:** 🟢 Fresh Products • ⚡ Fast Shopping • 🚚 Local Delivery • 💚 Trusted Kirana Store

---

## 2. Business Problem & Vision

### Problem Statement
Local households in Mahruni currently rely on manual store visits or informal phone calls to buy daily grocery essentials (Atta, Dal, Oil, Spices, Dairy, Snacks). This causes:
1. Long waiting times during rush hours.
2. Lack of real-time inventory and discount visibility.
3. Inconvenient payment methods and manual ledger tracking.
4. Limited delivery options for nearby rural and town residents.

### Vision
Build a hyper-local e-commerce web platform combining **Blinkit-style convenience**, modern responsive design, local Kirana familiarity, instant search, dynamic delivery calculation, Razorpay digital payments, WhatsApp notifications, and an AI-powered assistant for store guidance.

---

## 3. Target Customer Segments & User Roles

### Target Audience
1. **Local Town Residents (Mahruni):** Families seeking same-day/1-hour home delivery within 1 KM for daily Kirana items.
2. **Nearby Area Customers (1–15 KM):** Residents along Tikamgarh Road and nearby villages looking for scheduled grocery orders with transparent per-KM delivery charges.
3. **Store Owner & Staff:** Akash Chaudhary and store operators managing daily stock, fulfilling orders, reviewing sales analytics, and running festival promotions.

### System Roles
* **Customer:** Browses store, searches items, adds to cart, inputs delivery address, pays online or Cash on Delivery, tracks order status, receives WhatsApp alerts, interacts with AI assistant.
* **Admin / Store Owner:** Full control over product catalog, categories, inventory alerts, orders, payment verification, delivery parameters, coupons, promotional banners, sales reports, and customer management.

---

## 4. Core Business Goals & Success Metrics (KPIs)

### Business Goals
* Digitalize 100% of store inventory across 12+ daily essential categories.
* Enable automated delivery charge calculations based on customer distance.
* Reduce phone order processing times by 70%.
* Increase monthly order volume and customer repeat purchases.

### Success Metrics (KPIs)
* **Average Order Value (AOV):** Targets ₹350 – ₹600.
* **Fulfillment Time:** Under 45 minutes for delivery within 1 KM.
* **Payment Success Rate:** >95% via Razorpay integration.
* **Customer Repeat Rate:** >40% within 30 days.

---

## 5. Functional Requirements

### 5.1 Customer Experience
1. **Catalog & Search:**
   - Instant search bar with debounced input.
   - Category filtering (Atta & Grains, Rice & Pulses, Oil & Ghee, Spices, Dairy, Snacks, Beverages, Personal Care, Household, Instant Food, Daily Essentials).
   - Dynamic product cards displaying unit price, original price, discount badge (%), stock availability, and 1-click "Add to Cart".
2. **Cart & Dynamic Delivery Engine:**
   - Slide-over Cart Drawer accessible from any page.
   - Real-time subtotal, total savings, dynamic delivery charge calculation based on store distance.
   - Configurable delivery charge formula:
     $$\text{delivery\_charge} = \begin{cases} 0 & \text{if } \text{distance} \le 1\text{ km} \\ \lceil \text{distance} - 1 \rceil \times 10 & \text{if } \text{distance} > 1\text{ km} \end{cases}$$
3. **Checkout & Secure Payment:**
   - Saved delivery addresses with distance detection.
   - Razorpay integration (UPI GooglePay/PhonePe/Paytm, Credit/Debit cards, Net Banking) + Cash on Delivery option.
   - Strict server-side Razorpay HMAC signature verification before confirming payments.
4. **Order Status Timeline & Notifications:**
   - Live visual status pipeline: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PROCESSING` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
   - Automatic customer WhatsApp order confirmation payload and in-app notifications.
5. **Store AI Assistant:**
   - Floating AI assistant widget capable of answering product stock questions, store operating hours, delivery fees, and daily deals.

### 5.2 Store Owner / Admin Dashboard
1. **Product & Inventory Management:**
   - Create, edit, soft-delete products with unit types (`kg`, `g`, `litre`, `ml`, `packet`, `piece`).
   - Low-stock auto alert threshold (e.g., alert when stock $< 5$ units).
2. **Order Fulfillment Workflow:**
   - Real-time notification of new incoming orders.
   - Admin confirmation step verifying physical item availability before marking orders as `CONFIRMED`.
3. **Sales & Business Analytics:**
   - Daily, weekly, monthly gross revenue metrics, total orders count, average order value, payment method breakdown, top-selling items.
4. **Marketing & Banner Manager:**
   - Upload homepage promo banners, festival discount codes, banner text overlays, and promo video links.

---

## 6. Non-Functional Requirements

* **Performance:** First Contentful Paint (FCP) $< 1.2\text{s}$, interactive under average 3G/4G network conditions.
* **Security:** JWT authentication, bcrypt password hashing (10 rounds), parameterized SQL protection via Supabase client, HTTPS enforcement, environment variable secret isolation.
* **Scalability:** Stateless Node.js backend suitable for Render web service autoscaling; Supabase PostgreSQL connection pooler handling concurrent transactions.
* **Usability & Accessibility:** Mobile-first design, bottom navigation bar for high thumb accessibility, minimum 48px tap targets, high-contrast Fresh Green (`#06C167`) branding.

---

## 7. Delivery System Configuration

| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| `free_delivery_radius_km` | `1` | Radius within which delivery is 100% free |
| `charge_per_extra_km` | `10` | Delivery fee charged per additional KM beyond 1 KM |
| `maximum_delivery_radius_km` | `15` | Maximum serviceable radius from store address |
| `min_order_amount_free_delivery` | `500` | Optional order threshold for free delivery promotion |

---

## 8. Order & Payment Lifecycle

```text
Order Created (PENDING)
       │
Razorpay Payment Execution
       │
Backend HMAC Signature Verification
       │
Payment Status = PAID (Admin Notified)
       │
Admin Confirms Item Availability
       │
Order Status = CONFIRMED
       │
Customer WhatsApp + In-App Notification Sent
```

---

## 9. Future Enhancement Roadmap

* Integration of official WhatsApp Business Cloud API automated messaging.
* Multi-language support (Hindi & English localized toggle).
* Customer loyalty reward points on completed purchases.
* Route optimization for local delivery driver dispatch app.
