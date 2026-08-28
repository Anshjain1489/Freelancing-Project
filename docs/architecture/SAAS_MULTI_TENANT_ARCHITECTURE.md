# Multi-Tenant & White-Label SaaS Architecture 🏛️🏪

## 1. Overview
Chaudhary Kirana Store features a non-disruptive, database-backed multi-tenant SaaS architecture designed to scale from a single enterprise retail store to a multi-store white-labeled commercial platform.

## 2. Core SaaS Data Model
- **Organizations (`organizations`)**: Top-level enterprise account entity. Represents the business entity owning one or multiple stores.
- **Stores (`stores`)**: Individual physical or virtual retail stores under an organization.
- **Store Branding (`store_branding`)**: Stores custom white-label branding parameters per store:
  - `store_name`, `logo_url`, `favicon_url`
  - `primary_color`, `secondary_color`, `accent_color`
  - `website_title`, `support_email`, `support_phone`, `footer_text`
- **Store Settings (`store_settings`)**: Key-value business parameters per store (`delivery_enabled`, `pos_enabled`, `minimum_order_amount`, etc.).
- **Feature Flags (`feature_flags` & `store_feature_flags`)**: Controls module feature availability per store (`ENABLE_POS`, `ENABLE_DELIVERY`, `ENABLE_PROCUREMENT`, `ENABLE_FINANCE`, `ENABLE_ANALYTICS`).

## 3. Server-Authoritative Tenant Isolation
Store context (`req.store`, `req.organization`) is resolved server-authoritatively by `storeContext.middleware.js` using authenticated user sessions. Unauthenticated public requests resolve default store branding via `/api/v1/store-config/public`.
