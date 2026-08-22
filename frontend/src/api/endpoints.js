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

  ORDERS: {
    CREATE: '/orders',
    LIST: '/orders',
    BY_ID: (id) => `/orders/${id}`,
    CANCEL: (id) => `/orders/${id}/cancel`,
    RETRY_PAYMENT: (id) => `/orders/${id}/payment/retry`
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

  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    ANALYTICS_REVENUE: '/admin/analytics/revenue',
    ANALYTICS_TOP_PRODUCTS: '/admin/analytics/top-products',
    PRODUCTS: '/admin/products',
    PRODUCT_BY_ID: (id) => `/admin/products/${id}`,
    CATEGORIES: '/admin/categories',
    INVENTORY: '/admin/inventory',
    ADJUST_INVENTORY: (productId) => `/admin/inventory/${productId}/adjust`,
    ORDERS: '/admin/orders',
    UPDATE_ORDER_STATUS: (id) => `/admin/orders/${id}/status`,
    CUSTOMERS: '/admin/customers',
    PAYMENTS: '/admin/payments',
    PROMOTIONS: '/admin/promotions',
    BANNERS: '/admin/banners',
    ACTIVITY: '/admin/activity'
  }
};
