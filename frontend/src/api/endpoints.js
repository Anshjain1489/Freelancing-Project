export const ENDPOINTS = {
  HEALTH: '/health',

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    GOOGLE: '/auth/google',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },

  USER: {
    PROFILE: '/users/me',
    UPDATE_PROFILE: '/users/me'
  },

  CATEGORIES: {
    LIST: '/categories',
    BY_SLUG: (slug) => `/categories/${slug}`
  },

  PRODUCTS: {
    LIST: '/products',
    FEATURED: '/products/featured',
    SEARCH: '/products/search',
    BY_SLUG: (slug) => `/products/${slug}`
  },

  CART: {
    GET: '/cart',
    ADD_ITEM: '/cart/items',
    UPDATE_ITEM: (itemId) => `/cart/items/${itemId}`,
    REMOVE_ITEM: (itemId) => `/cart/items/${itemId}`,
    CLEAR: '/cart',
    SYNC: '/cart/sync'
  },

  ADDRESSES: {
    LIST: '/addresses',
    CREATE: '/addresses',
    UPDATE: (id) => `/addresses/${id}`,
    DELETE: (id) => `/addresses/${id}`
  },

  CHECKOUT: {
    PREVIEW: '/checkout/preview'
  },

  COUPONS: {
    VALIDATE: '/coupons/validate',
    AVAILABLE: '/coupons/available'
  },

  ORDERS: {
    CREATE: '/orders',
    LIST: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    CANCEL: (id) => `/orders/${id}/cancel`,
    RETRY_PAYMENT: (id) => `/orders/${id}/payment/retry`
  },

  DELIVERY: {
    DASHBOARD: '/delivery/dashboard',
    ORDERS: '/delivery/orders',
    BY_ID: (id) => `/delivery/orders/${id}`,
    ACCEPT: (id) => `/delivery/orders/${id}/accept`,
    PICKUP: (id) => `/delivery/orders/${id}/pickup`,
    START: (id) => `/delivery/orders/${id}/start`,
    DELIVER: (id) => `/delivery/orders/${id}/deliver`,
    FAILED: (id) => `/delivery/orders/${id}/failed`
  },

  PAYMENTS: {
    VERIFY_RAZORPAY: '/payments/razorpay/verify',
    FAILURE_RAZORPAY: '/payments/razorpay/failure'
  },

  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences'
  },

  CHATBOT: {
    SEND_MESSAGE: '/chatbot/messages'
  },

  CANCELLATIONS: {
    REQUEST: (orderId) => `/orders/${orderId}/cancellation-request`,
    MY: '/cancellations/my'
  },

  RETURNS: {
    REQUEST: (orderId) => `/orders/${orderId}/return-request`,
    MY: '/returns/my'
  },

  REPLACEMENTS: {
    REQUEST: (orderId) => `/orders/${orderId}/replacement-request`,
    MY: '/replacements/my'
  },

  REVERSE_PICKUP: {
    LIST: '/delivery/return-pickups',
    ACCEPT: (id) => `/delivery/return-pickups/${id}/accept`,
    PICKUP: (id) => `/delivery/return-pickups/${id}/pickup`,
    FAIL: (id) => `/delivery/return-pickups/${id}/fail`
  },

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    ANALYTICS_REVENUE: '/admin/analytics/revenue',
    ANALYTICS_TOP_PRODUCTS: '/admin/analytics/top-products',
    PRODUCTS: '/admin/products',
    PRODUCT_BY_ID: (id) => `/admin/products/${id}`,
    CATEGORIES: '/admin/categories',
    INVENTORY: '/admin/inventory',
    ADD_STOCK: (productId) => `/admin/inventory/${productId}/add`,
    REMOVE_STOCK: (productId) => `/admin/inventory/${productId}/remove`,
    STOCK_THRESHOLD: (productId) => `/admin/inventory/${productId}/threshold`,
    STOCK_MOVEMENTS: (productId) => `/admin/inventory/${productId}/movements`,
    ADJUST_INVENTORY: (productId) => `/admin/inventory/${productId}/adjust`,
    ORDERS: '/admin/orders',
    UNRESOLVED_ORDERS: '/admin/orders/unresolved',
    ACCEPT_ORDER: (id) => `/admin/orders/${id}/accept`,
    REJECT_ORDER: (id) => `/admin/orders/${id}/reject`,
    RETRY_REFUND: (id) => `/admin/orders/${id}/refund/retry`,
    UPDATE_ORDER_STATUS: (id) => `/admin/orders/${id}/status`,
    CANCELLATIONS: '/admin/cancellations',
    APPROVE_CANCELLATION: (id) => `/admin/cancellations/${id}/approve`,
    REJECT_CANCELLATION: (id) => `/admin/cancellations/${id}/reject`,
    RETURNS: '/admin/returns',
    APPROVE_RETURN: (id) => `/admin/returns/${id}/approve`,
    REJECT_RETURN: (id) => `/admin/returns/${id}/reject`,
    ASSIGN_RETURN_PICKUP: (id) => `/admin/returns/${id}/assign-pickup`,
    RECEIVE_RETURN: (id) => `/admin/returns/${id}/receive`,
    REPLACEMENTS: '/admin/replacements',
    APPROVE_REPLACEMENT: (id) => `/admin/replacements/${id}/approve`,
    REJECT_REPLACEMENT: (id) => `/admin/replacements/${id}/reject`,
    UPDATE_REPLACEMENT_FULFILLMENT: (id) => `/admin/replacements/${id}/fulfillment`,
    DELIVERY_PARTNERS: '/admin/delivery-partners',
    UNASSIGNED_DELIVERY_ORDERS: '/admin/delivery/orders/unassigned',
    ASSIGN_DELIVERY: (orderId) => `/admin/orders/${orderId}/assign-delivery`,
    REASSIGN_DELIVERY: (orderId) => `/admin/orders/${orderId}/reassign-delivery`,
    COUPONS: '/admin/coupons',
    COUPON_BY_ID: (id) => `/admin/coupons/${id}`,
    CUSTOMERS: '/admin/customers',
    PAYMENTS: '/admin/payments',
    PROMOTIONS: '/admin/promotions',
    BANNERS: '/admin/banners',
    ACTIVITY: '/admin/activity'
  }
};
