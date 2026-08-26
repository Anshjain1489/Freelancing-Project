# Chaudhary Kirana Store — Production Release Checklist

## 1. Environment & Infrastructure Verification
- [x] **Render Backend Service**: Connected to GitHub repository `origin/main`.
- [x] **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `JWT_ACCESS_SECRET` (configured with >32 char secure random key)
  - `JWT_REFRESH_SECRET` (configured with >32 char secure random key)
  - `SUPABASE_URL` (`https://vuhwlckfhexlyezmfled.supabase.co`)
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL` (Supabase PostgreSQL pooler string)
  - `FRONTEND_URL` (`https://chaudharykiranastore.vercel.app`)
  - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- [x] **OTP Service Removal**: `OTP_ENCRYPTION_KEY` permanently removed and exempted from startup validation.

---

## 2. Health & Readiness Verification
- [x] **Public Liveness Probe**: `GET /api/v1/health` returns `HTTP 200 OK` (`{"status":"ok"}`).
- [x] **Readiness Probe**: `GET /api/v1/health/ready` returns `HTTP 200 OK` (`{"operationalState":"ACTIVE"}`).
- [x] **Graceful Shutdown**: `SIGTERM` and `SIGINT` signals cleanly close HTTP listeners and background job queues.

---

## 3. Authentication & Security Audit
- [x] **Startup Secret Validation**: Rejects missing secrets, short keys (< 32 chars), and default placeholders (`changeme`, `secret`, etc.).
- [x] **Single-Flight 401 Recovery**: Intercepts 401 status, attempts refresh token recovery once, retries pending requests on success, and clears stale `localStorage` on failure.
- [x] **Role Barriers (RBAC)**: Enforces `CUSTOMER`, `ADMIN`, and `DELIVERY_PARTNER` boundary isolation (non-admin requests to `/api/v1/admin/*` return HTTP 403 Forbidden).
- [x] **Log Redaction**: Passwords, tokens, authorization headers, and secrets are redacted from structured logs.

---

## 4. Database & Concurrency Protection
- [x] **Supabase PostgreSQL Schema**: 037/041 migrations applied (`users`, `orders`, `order_items`, `products`, `coupons`, `deliveries`).
- [x] **Atomic Stock Deductions**: `UPDATE products SET stock_quantity = stock_quantity - N WHERE stock_quantity >= N`.
- [x] **Performance Indexes**: Indexes on `orders.user_id`, `orders.status`, `notifications.user_id`.

---

## 5. Real-Time SSE Event Synchronization
- [x] **Multi-Tab SSE Streams**: Authenticated users can open multiple tabs without connection drops.
- [x] **Role Broadcasts**: Admin notifications reach active admin dashboard streams; status updates reach customer streams.
- [x] **Logout Stream Cleanup**: User logout immediately closes active `EventSource` connections.

---

## 6. Release Certification Sign-Off
- **Status**: **GO FOR PRODUCTION RELEASE** 🚀
- **Certified Date**: 2026-08-26
- **Tested Commit Hash**: `dfaeb45` (and current HEAD)
