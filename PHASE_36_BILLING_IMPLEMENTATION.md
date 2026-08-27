# Phase 36 — Complete Billing, GST Invoice & Kirana Store POS System

## Overview
Phase 36 integrates an enterprise-grade Billing, GST Invoice, and Admin POS Counter System into the Chaudhary Kirana Store application.

## Key Features Implemented

### 1. Database Schema (`database/migrations/041_billing_pos_invoices.sql`)
- `invoices`: Core invoice table supporting both `ONLINE_ORDER` and `POS_SALE` types with sequential numbering `CKS-INV-YYYY-000001`.
- `invoice_items`: Immutable historical line-item snapshots preserving price, SKU, brand, discount, and tax percentage.
- `pos_sales`: Counter POS sale transaction records (`CKS-POS-YYYY-000001`).
- `pos_sale_items`: POS line item table linked to products and inventory movements.
- Performance indexes on invoice numbers, order IDs, sale numbers, customer IDs, and issued timestamps.

### 2. Financial & Calculation Engine (`backend/src/services/invoice.service.js`)
- Server-authoritative calculation of line subtotals, line discounts, GST tax amounts, delivery charges, round-offs, and grand totals.
- Idempotent invoice generation for online orders.
- Atomic POS counter sale creation with stock validation, inventory movement logging (`POS_SALE`), and GST invoice issuance.
- Admin POS sale cancellation with inventory restoration (`POS_SALE_CANCELLED`).
- Security role checks preventing unauthorized customer access to invoices (IDOR protection).

### 3. API Endpoints (`backend/src/routes/invoice.routes.js`)
- `GET /api/v1/invoices/:id`: Fetch invoice details by ID (Role protected).
- `GET /api/v1/orders/:id/invoice`: Fetch or auto-generate invoice for online order.
- `GET /api/v1/invoices/:id/download`: Printable HTML/PDF view.
- `POST /api/v1/admin/pos/sales`: Create POS sale & counter invoice (Admin only).
- `GET /api/v1/admin/pos/sales/:id`: Get POS sale details (Admin only).
- `POST /api/v1/admin/pos/sales/:id/cancel`: Cancel POS sale & restore stock (Admin only).
- `GET /api/v1/admin/invoices`: List all store invoices & revenue metrics (Admin only).

### 4. Admin POS Counter UI (`/admin/pos`)
- Responsive design for Desktop, Tablet, and Mobile (< 640px).
- Barcode scanner keyboard compatible product search input.
- Real-time cart quantity adjustment and item removal.
- Support for Walk-in and Registered Customers.
- Multi-payment selector (`CASH`, `UPI`, `CARD`).
- Instant printable receipt modal powered by `InvoiceView`.

### 5. Admin Invoices Management (`/admin/invoices`)
- Sales summary metrics: Today's Sales, Online Sales, POS Sales, Cash, UPI, and Card breakdowns.
- Search and status filters.
- View, print, and download actions.

### 6. Customer Order Integration
- `[ 🧾 View Invoice ]` and `[ ⬇ Download Invoice ]` added to `OrderDetailsPage.jsx` and `OrdersPage.jsx`.
