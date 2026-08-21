# End-to-End User Flows & Sequence Diagrams — Chaudhary Kirana Store

## 1. Overview of Core User Flows

This document details the step-by-step logic, decision branches, error fallbacks, and visual sequence diagrams for the primary customer and store owner operational flows.

---

## 2. Customer Order Placement & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant App as React Frontend
    participant API as Express API Service
    participant Razorpay as Razorpay SDK
    participant DB as Supabase PostgreSQL
    actor Admin as Akash Chaudhary (Owner)

    Customer->>App: Adds items to Cart & Clicks "Checkout"
    App->>App: Checks User Auth state
    alt Not Logged In
        App-->>Customer: Redirects to /login (Preserves Cart)
        Customer->>App: Logs in successfully
    end
    App->>App: Selects Delivery Address & Distance (e.g. 2.5 KM)
    App->>API: POST /api/cart/calculate { items, distanceKm: 2.5 }
    API->>API: Calculates Delivery: ceil(2.5 - 1) * 10 = ₹20
    API-->>App: Returns { subtotal, deliveryCharge: 20, totalAmount }
    Customer->>App: Clicks "Proceed to Pay (Razorpay)"
    App->>API: POST /api/orders/create { addressId, items, paymentMethod: "RAZORPAY" }
    API->>DB: Save Order Record (status: "PENDING", payment_status: "PENDING")
    API->>Razorpay: Create Razorpay Order (amount: totalAmount in paise)
    Razorpay-->>API: Returns razorpay_order_id
    API-->>App: Returns { orderId, razorpayOrderId, keyId, amount }
    App->>Razorpay: Opens Razorpay Checkout Modal
    Customer->>Razorpay: Authorizes Payment (UPI / Debit Card)
    alt Payment Failed
        Razorpay-->>App: Payment Error Callback
        App->>API: POST /api/payments/verify { status: "FAILED" }
        API->>DB: Update Payment & Order Status = "PAYMENT_FAILED"
        App-->>Customer: Displays Payment Failed Screen with Retry CTA
    else Payment Successful
        Razorpay-->>App: Returns { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        App->>API: POST /api/payments/verify { razorpay_payment_id, razorpay_order_id, razorpay_signature }
        API->>API: Computes HMAC SHA256 (razorpay_order_id + "|" + razorpay_payment_id)
        alt Signature Valid
            API->>DB: Update Payment = "SUCCESS", Order = "PENDING_CONFIRMATION", payment_status = "PAID"
            API->>Admin: Trigger Admin Notification (New Order Received!)
            API-->>App: Returns { success: true, orderId }
            App-->>Customer: Displays Order Received Screen & Visual Timeline
            Admin->>API: POST /api/admin/orders/:id/confirm (Verifies Kirana Stock)
            API->>DB: Update Order Status = "CONFIRMED", Decrement Stock
            API->>Customer: Dispatch WhatsApp Confirmation Message + In-App Notification
        else Signature Invalid
            API->>DB: Update Payment = "FAILED"
            API-->>App: Returns 400 Bad Request (Invalid Payment Signature)
        end
    end
```

---

## 3. Detailed Step-by-Step Logic Specifications

### Flow A: Dynamic Delivery Charge Calculation
1. **User Selects Address:** Customer picks address from saved list or enters new address in Mahruni.
2. **Distance Lookup:** Distance is retrieved (e.g. $d = 2.5\text{ km}$).
3. **Formula Execution:**
   - If $d \le 1.0\text{ km} \implies \text{deliveryCharge} = ₹0$.
   - If $d > 1.0\text{ km} \implies \text{deliveryCharge} = \lceil d - 1.0 \rceil \times 10$.
   - For $2.5\text{ km} \implies \lceil 1.5 \rceil \times 10 = 2 \times 10 = ₹20$.
4. **Validation Check:** If $d > 15.0\text{ km}$ (Maximum Serviceable Radius), system displays warning: *"Delivery address is beyond our 15 KM service zone from Near Bada Jain Mandir."*

---

### Flow B: Admin Product & Stock Inventory Management
1. **Admin Navigates to `/admin/products/new`.**
2. **Fills Form:** Title (`Fortune Mustard Oil 1L`), Category (`Oil & Ghee`), MRP (`₹175`), Selling Price (`₹150`), Unit (`litre`, `1.0`), Stock (`40`), Low Stock Alert (`5`).
3. **Submits Form:** API validates `sellingPrice <= mrpPrice` and `stockQuantity >= 0`.
4. **Database Record:** Insert into `products` table and `inventory` table.
5. **Real-time Alert:** If stock quantity drops below threshold during order fulfillment, admin sees low-stock alert pill in dashboard header.

---

### Flow C: WhatsApp Message Payload Dispatch
Upon Admin confirming order availability (`POST /api/admin/orders/:id/confirm`), backend generates the formatted message text:

```text
🎉 Your order from Chaudhary Kirana Store has been confirmed!

Order ID: #CKS-9921
Total Amount: ₹490
Status: Confirmed

Items:
- Aashirvaad Atta 5kg (x2)
- Fortune Mustard Oil 1L (x1)

Thank you for shopping with us! 🛒
Store Contact: 7897837095 / 7007550184
Near Bada Jain Mandir, Mahruni
```

The system triggers both an in-app notification record and an open-in-WhatsApp link (`https://wa.me/919876543210?text=...`) for one-click customer communication.
