const supabase = require('../config/supabase');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const { dispatchNotificationChannels } = require('./notification.dispatcher');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

// In-memory fallback notification store
const mockNotifications = [];

const createNotification = async ({ userId, type = 'ORDER', title, message, eventType, referenceType, referenceId, metadata = {}, recipientPhone = '' }) => {
  let notificationId = `notif-${Date.now()}`;

  if (supabase) {
    // 1. Insert in-app notification record
    const { data: newNotif, error } = await supabase.from('notifications').insert([{
      user_id: userId || null,
      type,
      title,
      message,
      event_type: eventType,
      reference_type: referenceType,
      reference_id: referenceId,
      metadata,
      is_read: false
    }]).select().single();

    if (!error && newNotif) {
      notificationId = newNotif.id;
    }
  } else {
    mockNotifications.unshift({
      id: notificationId,
      userId,
      type,
      title,
      message,
      eventType,
      referenceType,
      referenceId,
      metadata,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  // 2. Async Channel Dispatch (WhatsApp, SMS, etc.)
  dispatchNotificationChannels({
    notificationId,
    userId,
    eventType,
    recipientPhone,
    data: {
      orderNumber: referenceId,
      customerName: metadata.customerName,
      totalAmount: metadata.totalAmount,
      productName: metadata.productName,
      currentStock: metadata.currentStock
    }
  }).catch(err => logger.error('[DISPATCH_ERROR]', err));

  return { notificationId };
};

// Listen to System Events
eventBus.on(EVENT_TYPES.ORDER_CONFIRMED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'ORDER',
    title: '🎉 Order Confirmed!',
    message: `Your order #${payload.orderNumber} for ₹${payload.totalAmount} has been confirmed.`,
    eventType: EVENT_TYPES.ORDER_CONFIRMED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload,
    recipientPhone: payload.customerPhone
  });
});

eventBus.on(EVENT_TYPES.ORDER_OUT_FOR_DELIVERY, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'ORDER',
    title: '🛵 Out for Delivery!',
    message: `Your order #${payload.orderNumber} is out for delivery with our Mahruni team.`,
    eventType: EVENT_TYPES.ORDER_OUT_FOR_DELIVERY,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload,
    recipientPhone: payload.customerPhone
  });
});

eventBus.on(EVENT_TYPES.ORDER_DELIVERED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'ORDER',
    title: '🎉 Order Delivered!',
    message: `Your order #${payload.orderNumber} has been delivered. Thank you!`,
    eventType: EVENT_TYPES.ORDER_DELIVERED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload,
    recipientPhone: payload.customerPhone
  });
});

eventBus.on(EVENT_TYPES.LOW_STOCK, async (payload) => {
  await createNotification({
    userId: null,
    type: 'INVENTORY',
    title: '⚠️ Low Stock Alert',
    message: `Product "${payload.productName}" inventory is low (${payload.currentStock} remaining).`,
    eventType: EVENT_TYPES.LOW_STOCK,
    referenceType: 'PRODUCT',
    referenceId: payload.productId,
    metadata: payload
  });
});

// Customer API Services
const getUserNotifications = async (userId, queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    const { data, count, error } = await supabase.from('notifications')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch notifications', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = data.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      eventType: n.event_type,
      referenceType: n.reference_type,
      referenceId: n.reference_id,
      isRead: n.is_read,
      readAt: n.read_at,
      createdAt: n.created_at
    }));

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  const filtered = mockNotifications.filter(n => !n.userId || n.userId === userId);
  return formatPaginatedResponse(filtered, page, limit, filtered.length);
};

const getUnreadCount = async (userId) => {
  if (supabase) {
    const { count, error } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_read', false);

    return { unreadCount: count || 0 };
  }

  const count = mockNotifications.filter(n => (!n.userId || n.userId === userId) && !n.isRead).length;
  return { unreadCount: count };
};

const markAsRead = async (userId, notificationId) => {
  if (supabase) {
    await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    const n = mockNotifications.find(x => x.id === notificationId);
    if (n) {
      n.isRead = true;
      n.readAt = new Date().toISOString();
    }
  }

  return { message: 'Notification marked as read' };
};

const markAllAsRead = async (userId) => {
  if (supabase) {
    await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_read', false);
  } else {
    mockNotifications.forEach(n => {
      if (!n.userId || n.userId === userId) {
        n.isRead = true;
        n.readAt = new Date().toISOString();
      }
    });
  }

  return { message: 'All notifications marked as read' };
};

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
