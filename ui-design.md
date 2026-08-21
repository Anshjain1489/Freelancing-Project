# UI & UX Design System — Chaudhary Kirana Store

## 1. Design Identity & Core Philosophy

**Chaudhary Kirana Store** features a modern, clean, hyper-accessible user interface designed to feel like a high-speed quick-commerce platform (such as Blinkit or Instamart) merged with the warmth, reliability, and trust of a local Mahruni Kirana store.

### Key Brand Values
* 🟢 **Freshness:** Soft mint and lush vibrant green colors reflecting crisp grocery quality.
* ⚡ **Speed:** Ultra-fast search, slide-over cart drawer, and 1-tap mobile bottom navigation.
* 💚 **Trust & Familiarity:** Direct owner contact numbers, store address, and local Mahruni delivery details clearly displayed.

---

## 2. Color Palette & CSS Tokens

```css
:root {
  /* Brand Primary Palette */
  --color-fresh-green: #06C167;        /* Primary CTAs, Checkout, Add to Cart, Badges */
  --color-green-hover: #05A356;         /* Button Hover & Active States */
  --color-soft-mint: #E8F7F0;           /* Highlights, Active Category Backgrounds, Alerts */
  --color-mint-border: #C2EBD6;         /* Subtle Borders for Grocery Cards */

  /* Promotional & Discount Palette */
  --color-vibrant-orange: #FF6B00;     /* Discounts, Urgency Badges, Special Offers */
  --color-orange-light: #FFF0E6;       /* Offer Background Highlight */

  /* Neutral Surface Palette */
  --color-bg-main: #FAFAFA;            /* Warm Off-White Page Background */
  --color-surface-card: #FFFFFF;       /* Clean White Container Cards */
  --color-text-primary: #1F2937;       /* Dark Charcoal Main Body Text */
  --color-text-secondary: #6B7280;     /* Muted Grey Captions & Subtitles */
  --color-border-subtle: #E5E7EB;     /* Divider Lines & Input Borders */

  /* Status Colors */
  --color-status-success: #10B981;     /* Paid / Delivered */
  --color-status-warning: #F59E0B;     /* Pending / Processing */
  --color-status-danger: #EF4444;      /* Out of Stock / Cancelled */

  /* Typography & Shadows */
  --font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-card: 0 4px 12px -2px rgba(6, 193, 103, 0.08);
  --shadow-drawer: -4px 0 24px rgba(0, 0, 0, 0.15);
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-full: 9999px;
}
```

---

## 3. Typography & Hierarchy

We use **Inter** (Google Fonts) for crisp readability across mobile and desktop devices.

| Role | Size / Weight | Line Height | Application |
| :--- | :--- | :--- | :--- |
| **Hero Heading** | 32px / ExtraBold (800) | 1.2 | Main Homepage Hero Banner |
| **Section Heading** | 22px / Bold (700) | 1.3 | Category Headers, Section Titles |
| **Product Title** | 15px / SemiBold (600) | 1.4 | Product Card Labels |
| **Price (Selling)** | 16px / Bold (700) | 1.0 | Discounted Price Tag |
| **Price (MRP)** | 13px / Medium (500) | 1.0 | Strikethrough MRP Tag |
| **Body / Description**| 14px / Regular (400) | 1.5 | General Text & Guidelines |
| **Caption / Badge** | 11px / Bold (700) | 1.0 | Discount % Badges, Unit Tags |

---

## 4. Key UI Components & Interaction Standards

### 4.1 Product Card Design
* **Thumbnail:** 1:1 Aspect ratio, soft rounded border, lazy loading with skeleton state.
* **Discount Tag:** Positioned top-left, Vibrant Orange Pill (`12% OFF`).
* **Price Section:** Bold Green Selling Price + Strikethrough MRP Price side-by-side.
* **Add to Cart CTA:**
  - Initial State: Clean Green outlined button `+ ADD`.
  - Active State (When added): Solid Green Quantity Selector (`-  1  +`).

### 4.2 Cart Drawer (Slide-Over UX)
* Slides in from the right overlaying a dimmed backdrop (`rgba(0,0,0,0.5)`).
* Displays live item count badge, delivery distance progress bar, itemized list, discount breakdown, dynamic delivery fee alert, and sticky bottom `Proceed to Checkout` button.

### 4.3 Mobile Bottom Navigation Bar (Fixed 5-Tab Bar)
For screens $< 768\text{px}$, a sticky bottom navigation bar is present at all times:
1. 🏠 **Home**
2. 🗂 **Categories**
3. 🔍 **Search**
4. 🛒 **Cart** (with live floating badge)
5. 👤 **Profile**

---

## 5. Micro-Interactions & Loading States

* **Quantity Increments:** Smooth scale-up animation (`transform: scale(1.05)`) when tapping `+`.
* **Add to Cart Confetti & Toast:** Trigger animated toast `Added to Cart 🛒` at bottom-center.
* **Skeleton Loaders:** Pulse animation (`#E5E7EB` to `#F3F4F6`) for product cards during data fetch.
* **Order Confirmed Celebration:** Trigger full canvas confetti burst upon order confirmation.

---

## 6. Accessibility & Responsive Breakpoints

* **Mobile Small:** 320px – 480px (1-Column Product Grid option / 2-Column default).
* **Tablet:** 481px – 768px (3-Column Product Grid).
* **Desktop:** 769px – 1200px (4-Column Product Grid).
* **Large Desktop:** 1201px+ (5-Column Product Grid).
* Minimum touch tap area: $44\text{px} \times 44\text{px}$ on mobile screens.
