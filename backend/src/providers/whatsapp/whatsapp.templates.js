const EVENT_TYPES = require('../../events/eventTypes');

const TEMPLATE_MAPPING = {
  [EVENT_TYPES.ORDER_CONFIRMED]: {
    name: 'order_confirmed',
    buildComponents: (data) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.customerName || 'Customer' },
          { type: 'text', text: data.orderNumber },
          { type: 'text', text: String(data.totalAmount) }
        ]
      }
    ],
    fallbackText: (data) => `Hello ${data.customerName || 'Customer'} 👋\n\nYour order ${data.orderNumber} has been confirmed! 🎉\nOrder Total: ₹${data.totalAmount}\n\nThank you for shopping with Chaudhary Kirana Store 🛒`
  },

  [EVENT_TYPES.ORDER_OUT_FOR_DELIVERY]: {
    name: 'order_out_for_delivery',
    buildComponents: (data) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.customerName || 'Customer' },
          { type: 'text', text: data.orderNumber }
        ]
      }
    ],
    fallbackText: (data) => `Hello ${data.customerName || 'Customer'} 👋\n\n🛵 Your order ${data.orderNumber} is out for delivery! Our delivery partner will arrive soon at your doorstep.`
  },

  [EVENT_TYPES.ORDER_DELIVERED]: {
    name: 'order_delivered',
    buildComponents: (data) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.customerName || 'Customer' },
          { type: 'text', text: data.orderNumber }
        ]
      }
    ],
    fallbackText: (data) => `Hello ${data.customerName || 'Customer'} 👋\n\n🎉 Your order ${data.orderNumber} has been delivered!\nThank you for shopping with Chaudhary Kirana Store ❤️`
  },

  [EVENT_TYPES.ADMIN_NEW_ORDER]: {
    name: 'admin_new_order',
    buildComponents: (data) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.orderNumber },
          { type: 'text', text: data.customerName || 'Customer' },
          { type: 'text', text: String(data.totalAmount) }
        ]
      }
    ],
    fallbackText: (data) => `🛒 New Order Received!\n\nOrder: ${data.orderNumber}\nCustomer: ${data.customerName}\nTotal: ₹${data.totalAmount}\nPayment: Paid\n\nPlease process this order.`
  },

  [EVENT_TYPES.LOW_STOCK]: {
    name: 'low_stock_alert',
    buildComponents: (data) => [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.productName },
          { type: 'text', text: String(data.currentStock) }
        ]
      }
    ],
    fallbackText: (data) => `⚠️ Low Stock Alert!\n\nProduct: ${data.productName}\nCurrent Stock: ${data.currentStock}\n\nPlease restock soon.`
  }
};

const getWhatsAppTemplate = (eventType, data) => {
  const t = TEMPLATE_MAPPING[eventType];
  if (!t) return null;
  return {
    templateName: t.name,
    components: t.buildComponents(data),
    fallbackText: t.fallbackText(data)
  };
};

module.exports = { getWhatsAppTemplate };
