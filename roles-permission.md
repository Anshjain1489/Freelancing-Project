# Roles & Permissions Architecture — Chaudhary Kirana Store

## 1. Role Matrix Overview

| Feature / Resource | Guest User | Customer Role | Admin Role |
| :--- | :---: | :---: | :---: |
| Browse Products & Categories | ✅ | ✅ | ✅ |
| Full-Text Search | ✅ | ✅ | ✅ |
| Guest Cart (localStorage) | ✅ | — | — |
| Server Cart (`/api/v1/cart`) | — | ✅ | ✅ |
| Google OAuth Sign-In | ✅ | ✅ (CUSTOMER) | — |
| Place Orders & Pay via Razorpay | — | ✅ | — |
| Saved Addresses (`/addresses`) | — | ✅ | — |
| View Own Order History (`/orders`) | — | ✅ | — |
| In-App Notifications & Preferences | — | ✅ | ✅ |
| Admin Dashboard (`/admin/dashboard`) | ❌ (403) | ❌ (403) | ✅ |
| Business Intelligence & Revenue Analytics | ❌ (403) | ❌ (403) | ✅ |
| Product & Category CRUD | ❌ (403) | ❌ (403) | ✅ |
| Inventory Stock Adjustment & Audit | ❌ (403) | ❌ (403) | ✅ |
| Admin Order Status Transitions | ❌ (403) | ❌ (403) | ✅ |
| Customer Directory & Spend Metrics | ❌ (403) | ❌ (403) | ✅ |
| Activity Audit Logs (`/admin/activity`) | ❌ (403) | ❌ (403) | ✅ |

---

## 2. Enforcement Rules

1. **Backend Role Enforcement**: Every `/api/v1/admin/*` endpoint executes `authenticate` JWT validation followed by `authorizeAdmin` (`req.user.role === 'ADMIN'`).
2. **Frontend Protection**: Route guard `ProtectedAdminRoute` checks `user.role === 'ADMIN'`. Unauthorized visitors are redirected to `/`.
