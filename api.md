# API Documentation — Chaudhary Kirana Store REST API (V1)

## 1. Global API Standards

* **Base URL:** `/api/v1`
* **Protocol:** HTTPS RESTful JSON APIs
* **Authentication:** Bearer JWT in Request Headers: `Authorization: Bearer <token>` (Optional for Chatbot)

---

## 2. AI Chatbot Assistant APIs 🤖

### 2.1 Send User Message to AI Chatbot Assistant
* **POST** `/api/v1/chatbot/messages`
* **Headers:** `Authorization: Bearer <token>` (Optional — authenticated users receive order tracking capabilities)
* **Rate Limit:** 20 requests / minute (`chatbotLimiter`)
* **Request Body:**
```json
{
  "message": "Show me Aashirvaad Atta under ₹300",
  "sessionId": "guest_session_123"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "AI Chatbot response generated",
  "data": {
    "conversationId": "conv-1787260810782",
    "message": "Here are the matching grocery items available at Chaudhary Kirana Store 🛒",
    "products": [
      {
        "id": "p-1",
        "name": "Aashirvaad Shuddh Chakki Atta 5kg",
        "brand": "Aashirvaad",
        "mrp": 250,
        "sellingPrice": 235,
        "unit": "kg",
        "inStock": true
      }
    ],
    "actions": [
      {
        "type": "VIEW_CATALOG",
        "label": "Explore Full Catalog 🛒",
        "target": "/products"
      }
    ]
  }
}
```
