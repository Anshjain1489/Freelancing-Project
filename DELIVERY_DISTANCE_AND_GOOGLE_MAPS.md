# Google Maps Address Selection & Distance-Based Delivery Charges Architecture

## Overview

Phase 33 introduces a Google Maps-powered delivery address selection and road distance delivery charge system for **Chaudhary Kirana Store**.

Customers can choose their delivery location via:
1. **📍 Use My Current Location**: Browser Geolocation API (`navigator.geolocation.getCurrentPosition`).
2. **🔎 Search Address**: Google Places Autocomplete & address search.
3. **Interactive Map Selection**: Tap or drag the map pin to adjust exact delivery location coordinates.

The backend calculates the actual road distance from the store's canonical location (`Chaudhary Kirana Store, Tikamgarh Road, Mahruni`) and computes the delivery charge using the central formula:

$$\text{Delivery Charge} = \text{round}(\text{actualRoadDistanceKm} \times 10)$$

Starting from **₹0 at 0 km**, with zero minimum delivery charge or old free-radius offsets.

---

## Store Canonical Location Configuration

The store location is centrally managed in `STORE_LOCATION` configuration and `delivery_settings` database table:

```javascript
const STORE_LOCATION = {
  name: 'Chaudhary Kirana Store',
  address: 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh, India',
  latitude: 24.2381000,
  longitude: 78.7364000,
  chargePerKm: 10.00,
  minDeliveryCharge: 0.00,
  maxDeliveryRadiusKm: 50.00
};
```

Verified Google Maps Link: https://maps.app.goo.gl/2DDzERBrWnrTB64v5

---

## Delivery Charge Formula Examples

| Road Distance (KM) | Calculation | Final Delivery Charge |
| :---: | :---: | :---: |
| 0 km | $\text{round}(0 \times 10)$ | **₹0** |
| 0.5 km | $\text{round}(0.5 \times 10)$ | **₹5** |
| 1.0 km | $\text{round}(1.0 \times 10)$ | **₹10** |
| 2.3 km | $\text{round}(2.3 \times 10)$ | **₹23** |
| 3.4 km | $\text{round}(3.4 \times 10)$ | **₹34** |
| 5.0 km | $\text{round}(5.0 \times 10)$ | **₹50** |
| 10.0 km | $\text{round}(10.0 \times 10)$ | **₹100** |

---

## Backend Authority & API Security

1. **Endpoint**: `POST /api/v1/delivery/calculate`
   - Accepts `{ "latitude": 24.2500, "longitude": 78.7500 }`.
   - Validates latitude (-90 to 90) and longitude (-180 to 180).
   - Rate-limited against automated scanning or abuse.
2. **Backend Recalculation**: During checkout preview (`getCheckoutPreview`) and order creation (`createOrder`), the backend recalculates the delivery fee based on address coordinates. Client-side delivery fees are never trusted.
3. **API Key Security**: Server-side Google Maps keys (`GOOGLE_MAPS_SERVER_API_KEY`) are protected in environment variables and never logged or exposed in HTTP responses.

---

## Environment Variables Configuration

Add the following keys to `.env`:

```env
# Google Maps API Keys
VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key_here
GOOGLE_MAPS_SERVER_API_KEY=your_server_restricted_key_here

# Canonical Store Coordinates
STORE_LATITUDE=24.2381000
STORE_LONGITUDE=78.7364000
MAX_DELIVERY_RADIUS_KM=50.00
```
