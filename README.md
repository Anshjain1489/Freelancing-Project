# Chaudhary Kirana Store — Full-Stack E-Commerce Platform 🌾🛒

A complete, production-ready, full-stack local Kirana grocery platform built specifically for **Chaudhary Kirana Store** in Mahruni, India.

---

## 🏬 Store Information & Business Identity

* **Store Name:** Chaudhary Kirana Store
* **Owner:** Akash Chaudhary
* **Primary Contact Phone:** `+91 7897837095`
* **Secondary Contact Phone:** `+91 7007550184`
* **Store Address:** Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh, India
* **Delivery Policy:**
  * `0 – 1.0 KM`: **FREE Delivery** (₹0 charge)
  * `Beyond 1.0 KM`: **₹10 per additional KM** ($\lceil \text{distance} - 1 \rceil \times 10$). Max radius: 15.0 KM.

---

## 🚀 Key Features

1. **Shopping Catalog & Full-Text Search**:
   - PostgreSQL Full-Text Search (`tsvector` & GIN index) across 32 Kirana products & 12 categories.
   - Category filtering, price sorting, debounced search bar.
2. **Dual Cart Architecture & Google Authentication**:
   - Guest localStorage cart with seamless server cart synchronization (`POST /cart/sync`) upon login.
   - Email/Password auth + Google OAuth 2.0 Sign-In (`@react-oauth/google` with backend ID token verification).
3. **Razorpay Payment & Distance-Based Delivery Fee Pipeline**:
   - Backend Haversine distance fee calculation.
   - Secure Razorpay Order generation & backend HMAC SHA256 payment signature verification (`POST /payments/razorpay/verify`).
   - Idempotent stock deduction, payment `PAID` updates, and automated cart clearing.
4. **Event-Driven Notifications & WhatsApp Business Cloud API**:
   - Decoupled `eventBus.js` emitting order & inventory events.
   - Idempotent dispatcher (`notification.dispatcher.js`) sending customer & admin WhatsApp messages (`order_confirmed`, `order_out_for_delivery`, `admin_new_order`, `low_stock`).
   - Customer in-app notification center and WhatsApp opt-in/opt-out preferences.
5. **Admin Dashboard & Business Intelligence Engine**:
   - Strict RBAC protection (`authorizeAdmin` guard returning 403 Forbidden to customer accounts).
   - Real KPI metrics (Today's revenue, order status breakdown, AOV, low stock alerts, top selling products).
   - Product & Category CRUD, atomic stock adjustments with `inventory_movements` audit ledger, and admin activity audit log.
6. **Store-Aware AI Chatbot Assistant Widget 🤖**:
   - Backend Gemini AI provider abstraction (`gemini.provider.js` & `aiProvider.js`) with smart fallback engine.
   - Executes trusted tools: product budget searches (`searchProducts`), delivery fee checks (`getDeliveryInfo`), store contact info (`getStoreInfo`), and user order status (`getUserLatestOrder`).
   - Interactive product cards with 1-click **[Add to Cart]** and prompt injection security.
7. **SEO, Google Visibility & Code-Splitting Optimization 🔍**:
   - Dynamic page titles, meta descriptions, canonical URLs, and private page `noindex` protection.
   - Valid JSON-LD structured data schemas (`GroceryStore`, `Product`, `Offer`, `BreadcrumbList`).
   - Dynamic Sitemap XML (`GET /api/v1/sitemap.xml`) and `robots.txt`.
   - `React.lazy()` route code-splitting for optimized bundle sizes.

---

## 🏗️ Production Architecture & Deployment

```
                     ┌────────────────────────┐
                     │        Customer        │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │ React + Vite Frontend  │
                     │  (Deployed on Vercel)  │
                     └───────────┬────────────┘
                                 │
                                 ▼
                     ┌────────────────────────┐
                     │  Node.js + Express API │
                     │  (Deployed on Render)  │
                     └───────────┬────────────┘
                                 │
    ┌──────────────┬─────────────┼──────────────┬──────────────┐
    │              │             │              │              │
    ▼              ▼             ▼              ▼              ▼
┌─────────┐   ┌──────────┐  ┌──────────┐   ┌──────────┐   ┌─────────┐
│Supabase │   │ Razorpay │  │  Google  │   │ WhatsApp │   │   AI    │
│PostgreSQL   │ Payments │  │   Auth   │   │  Cloud   │   │ Chatbot │
└─────────┘   └──────────┘  └──────────┘   └──────────┘   └─────────┘
```

For complete step-by-step production setup, environment variables configuration, Vercel & Render instructions, Razorpay live mode, WhatsApp Cloud API integration, Google Business Profile and Search Console verification, refer to [deployment.md](file:///d:/chaudhary%20kirana%20store/deployment.md).

---


## 💻 Local Setup & Installation

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure JWT_ACCESS_SECRET, SUPABASE_URL, etc. in .env
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure VITE_API_BASE_URL=http://localhost:5000/api/v1
npm run dev
```

### 3. Running Automated Test Suites
```bash
# Phase 4 REST API & Auth Tests
node backend/src/test_phase4.js

# Google Auth Integration Tests
node backend/src/test_google_auth.js

# Phase 7 Payments & Checkout Tests
node backend/src/test_phase7_payments.js

# Phase 8 Event Notifications & WhatsApp Tests
node backend/src/test_phase8_notifications.js

# Phase 9 Admin Dashboard & Analytics Tests
node backend/src/test_phase9_admin.js

# Phase 10 AI Chatbot Tests
node backend/src/test_phase10_chatbot.js

# Phase 11 SEO & Production Optimization Tests
node backend/src/test_phase11_seo.js
```
