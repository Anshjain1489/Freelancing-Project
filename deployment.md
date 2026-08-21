# Deployment & Production Setup Guide — Chaudhary Kirana Store 🌾🛒

This guide provides step-by-step instructions for deploying the **Chaudhary Kirana Store** platform to production, configuring live third-party services, and verifying domain visibility before going live.

---

## 🏗️ 1. Production Architecture Overview

The system operates on a cloud-native architecture optimized for high availability, fast asset delivery, secure transaction processing, and automated customer communications.

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

---

## 🔑 2. Environment Variables Configuration Reference

### Backend Web Service (Render) Environment Variables
Set these variables under **Render Dashboard → Web Service → Environment**:

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Web service listening port | `5000` |
| `FRONTEND_URL` | Live frontend domain (CORS whitelist) | `https://chaudharykiranastore.in` |
| `SUPABASE_URL` | Supabase project REST API endpoint | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anonymous key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase elevated service role key | `eyJhbGciOi...` |
| `JWT_ACCESS_SECRET` | Secret key for access tokens | `prod_jwt_access_secret_998877` |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `prod_jwt_refresh_secret_112233` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID | `123456789-abc.apps.googleusercontent.com` |
| `RAZORPAY_KEY_ID` | Razorpay Live Mode Key ID | `rzp_live_XXXXXXXXXXXXXX` |
| `RAZORPAY_KEY_SECRET` | Razorpay Live Secret Key | `YYYYYYYYYYYYYYYYYYYYYYYY` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | `whsec_ZZZZZZZZZZZZZZZZ` |
| `WHATSAPP_ENABLED` | Toggle WhatsApp Cloud API (set `false` to disable) | `false` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Phone Number ID | `105938472910485` |
| `WHATSAPP_ACCESS_TOKEN` | Meta Permanent Access Token | `EAAG...` |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token string | `chaudhary_kirana_wa_verify_2026` |
| `ADMIN_WHATSAPP_NUMBERS` | Comma-separated admin alert numbers | `7897837095,7007550184` |
| `AI_ENABLED` | Toggle Gemini AI Chatbot widget | `true` |
| `AI_PROVIDER` | AI provider name | `gemini` |
| `AI_API_KEY` | Google Gemini AI API key | `AIzaSy...` |
| `AI_MODEL` | Gemini AI model identifier | `gemini-1.5-flash` |
| `CHATBOT_RATE_LIMIT_WINDOW_MS` | AI rate limit window in ms | `60000` |
| `CHATBOT_RATE_LIMIT_MAX_REQUESTS` | AI rate limit max calls per window | `20` |

### Frontend Web Service (Vercel) Environment Variables
Set these variables under **Vercel Project Settings → Environment Variables**:

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Live backend API URL | `https://api.chaudharykiranastore.in/api/v1` |
| `VITE_GOOGLE_CLIENT_ID` | Production Google Client ID | `123456789-abc.apps.googleusercontent.com` |
| `VITE_RAZORPAY_KEY_ID` | Production Razorpay Key ID | `rzp_live_XXXXXXXXXXXXXX` |

---

## 🚀 3. Deployment Steps

### Step 1: Database Setup (Supabase PostgreSQL)
1. Log in to [Supabase Console](https://supabase.com/).
2. Select your project and navigate to **SQL Editor**.
3. Run the complete `database/schema.sql` script to create:
   - 32 normalized tables & foreign key constraints.
   - PostgreSQL Full-Text Search column `fts_doc` and GIN index.
   - Atomic stock movement functions (`adjust_product_stock`).
4. Execute `database/seed.sql` to populate initial product categories, store configuration, and admin user credentials.

### Step 2: Backend API Service Deployment (Render)
1. Log in to [Render Dashboard](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`chaudhary-kirana-store`).
4. Configure service settings:
   - **Name:** `chaudhary-kirana-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Input all backend environment variables listed in Section 2.
6. Verify service health check endpoint at `https://<render-backend-domain>/api/v1/health`.

### Step 3: Frontend Deployment (Vercel)
1. Log in to [Vercel Console](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`chaudhary-kirana-store`).
4. Select `frontend` as the **Root Directory**.
5. Framework Preset will auto-detect as **Vite**.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Add the frontend environment variables (`VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`).
7. Ensure `frontend/vercel.json` is included for SPA route rewrites (`/*` → `/index.html`).
8. Click **Deploy**.

---

## 📌 4. Final Steps Before Going Live

### 1. Connect Custom Production Domain
1. In Vercel, navigate to **Project Settings → Domains**.
2. Add your custom production domain (e.g., `chaudharykiranastore.in` and `www.chaudharykiranastore.in`).
3. Update DNS CNAME and A records at your domain registrar (GoDaddy/Namecheap):
   - A Record `@` → `76.76.21.21`
   - CNAME `www` → `cname.vercel-dns.com`
4. Update `FRONTEND_URL` in Render backend environment variables to match the production domain.

### 2. Configure Google Authentication (Live Mode)
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth 2.0 Web Client ID.
3. Under **Authorized JavaScript origins**, add:
   - `https://chaudharykiranastore.in`
   - `https://www.chaudharykiranastore.in`
4. Save changes.

### 3. Switch Razorpay to Production Mode & Webhook Verification
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch toggle from **Test Mode** to **Live Mode**.
3. Navigate to **API Keys** and generate Live Key ID & Live Key Secret.
4. Go to **Settings → Webhooks** → **Add New Webhook**:
   - **Webhook URL:** `https://api.chaudharykiranastore.in/api/v1/webhooks/razorpay`
   - **Secret:** Enter your `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events:** Select `payment.captured`, `payment.failed`, `order.paid`.
5. Update backend environment variables on Render with the live keys.
6. Conduct a live ₹1 test checkout to confirm payment capture, stock deduction, and WhatsApp confirmation dispatch.

### 4. Configure Meta WhatsApp Cloud API Live Credentials
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create/select your **WhatsApp Business Cloud API** application.
3. Obtain your permanent **System User Access Token** and **Phone Number ID**.
4. Register your WhatsApp Business Account phone number (`+91 7897837095`).
5. Ensure message templates are submitted and approved:
   - `order_confirmed`
   - `order_out_for_delivery`
   - `admin_new_order`
   - `low_stock`
6. Set Webhook Callback URL: `https://api.chaudharykiranastore.in/api/v1/webhooks/whatsapp` with verify token `chaudhary_kirana_wa_verify_2026`.

### 5. Google Business Profile & Google Search Console Verification

#### Google Business Profile Setup:
1. Visit [Google Business Profile](https://www.google.com/business/).
2. Register business listing: **Chaudhary Kirana Store**.
3. Set Business Category: **Grocery Store / Kirana Store**.
4. Address: Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh 284405, India.
5. Primary Phone: `+91 7897837095`. Secondary: `+91 7007550184`.
6. Upload store photos and add website URL `https://chaudharykiranastore.in`.

#### Google Search Console Verification:
1. Visit [Google Search Console](https://search.google.com/search-console).
2. Add Property `https://chaudharykiranastore.in`.
3. Verify ownership via DNS TXT Record or HTML tag verification.
4. Submit dynamic sitemap endpoint: `https://api.chaudharykiranastore.in/api/v1/sitemap.xml` (or `https://chaudharykiranastore.in/api/v1/sitemap.xml`).
5. Verify `robots.txt` indexing permissions.

---

## 🧪 5. Pre-Launch Verification & Smoke Test Checklist

- [ ] **Frontend Build & CDN:** Assets load with high performance, static files cached on Vercel CDN.
- [ ] **Backend Health Check:** `GET /api/v1/health` returns `200 OK` with database status `CONNECTED`.
- [ ] **Google OAuth Sign-In:** Customers can sign in via Google popup seamlessly.
- [ ] **Cart Synchronization:** Guest cart syncs into user account upon authentication (`POST /api/v1/cart/sync`).
- [ ] **Distance & Delivery Fee:** Delivery fee calculates accurately based on customer delivery address distance from Mahruni store center.
- [ ] **Razorpay Live Payment:** Order generation and HMAC SHA256 payment signature verification execute smoothly.
- [ ] **WhatsApp Business Notifications:** Customer receives instant order confirmation message on WhatsApp.
- [ ] **Admin Dashboard Security:** RBAC blocks non-admin users (`403 Forbidden`) while admins access inventory ledger & sales analytics.
- [ ] **AI Assistant Widget:** Gemini AI Chatbot correctly answers store inquiries and executes product budget search tools.
- [ ] **SEO & Structured Data:** Open Graph meta tags, canonical tags, and JSON-LD `GroceryStore` schemas validate on Google Rich Results Test.
