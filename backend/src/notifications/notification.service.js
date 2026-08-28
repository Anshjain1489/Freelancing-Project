const supabase = require('../config/supabase');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const { dispatchNotificationChannels } = require('./notification.dispatcher');
const sseManager = require('./sse.manager');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../utils/pagination');
const logger = require('../utils/logger');

// In-memory fallback notification store
const mockNotifications = [];
const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Get all user IDs that have the ADMIN role
 */
const getAdminUserIds = async () => {
  if (supabase) {
    try {
      const { data: adminUsers } = await supabase.from('users')
        .select(`
          id,
          user_roles (
            roles ( name )
          )
        `);

      if (adminUsers && adminUsers.length > 0) {
        const filtered = adminUsers.filter(u =>
          u.user_roles?.some(ur => ur.roles?.name === 'ADMIN')
        ).map(u => u.id);
        if (filtered.length > 0) return filtered;
      }

      const { data: directAdmins } = await supabase.from('users')
        .select('id')
        .or('email.eq.admin@chaudhary.com,phone.eq.7897837095');

      if (directAdmins && directAdmins.length > 0) {
        return directAdmins.map(u => u.id);
      }
    } catch (err) {
      logger.error('[GET_ADMIN_USERS_ERR]', err);
    }
  }
  return ['admin-1'];
};

const createNotification = async ({ userId, type = 'ORDER', title, message, eventType, referenceType, referenceId, metadata = {}, recipientPhone = '' }) => {
  let notificationId = `notif-${Date.now()}`;
  let notificationRecord = null;

  if (supabase && isUuid(userId)) {
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
      notificationRecord = {
        id: newNotif.id,
        userId: newNotif.user_id,
        type: newNotif.type,
        title: newNotif.title,
        message: newNotif.message,
        eventType: newNotif.event_type,
        referenceType: newNotif.reference_type,
        referenceId: newNotif.reference_id,
        metadata: newNotif.metadata,
        isRead: newNotif.is_read,
        createdAt: newNotif.created_at
      };
    }
  }

  if (!notificationRecord) {
    notificationRecord = {
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
    };
    mockNotifications.unshift(notificationRecord);
  }

  // 2. Real-time SSE Broadcast
  sseManager.broadcastNotification(notificationRecord);

  // 3. Async Channel Dispatch (WhatsApp, SMS, etc.)
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
  // 1. Customer Notification
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

  // 2. Target notifications for Admin user(s)
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: 'ORDER',
      title: `🛒 New Order #${payload.orderNumber}`,
      message: `New order received from ${payload.customerName || 'Customer'} for ₹${payload.totalAmount}.`,
      eventType: 'ADMIN_NEW_ORDER',
      referenceType: 'ORDER',
      referenceId: payload.orderNumber,
      metadata: payload,
      recipientPhone: ''
    });
  }
});

eventBus.on(EVENT_TYPES.ORDER_ACCEPTED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'ORDER',
    title: '✅ Order Accepted!',
    message: `Your order #${payload.orderNumber} has been accepted by the store and is being prepared.`,
    eventType: EVENT_TYPES.ORDER_ACCEPTED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload,
    recipientPhone: payload.customerPhone
  });
});

eventBus.on(EVENT_TYPES.ORDER_REJECTED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'ORDER',
    title: '❌ Order Update',
    message: `Unfortunately, your order #${payload.orderNumber} could not be accepted. Reason: ${payload.rejectionReason || 'Item unavailable'}`,
    eventType: EVENT_TYPES.ORDER_REJECTED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload,
    recipientPhone: payload.customerPhone
  });
});

eventBus.on(EVENT_TYPES.REFUND_INITIATED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'PAYMENT',
    title: '💰 Refund Initiated',
    message: `Your refund of ₹${payload.amount} for order #${payload.orderNumber} has been initiated and is processing.`,
    eventType: EVENT_TYPES.REFUND_INITIATED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload
  });
});

eventBus.on(EVENT_TYPES.REFUND_COMPLETED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'PAYMENT',
    title: '🎉 Refund Completed',
    message: `Your refund of ₹${payload.amount} for order #${payload.orderNumber} has been successfully completed!`,
    eventType: EVENT_TYPES.REFUND_COMPLETED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload
  });
});

eventBus.on(EVENT_TYPES.REFUND_FAILED, async (payload) => {
  await createNotification({
    userId: payload.userId,
    type: 'PAYMENT',
    title: '⚠️ Refund Notice',
    message: `Your order #${payload.orderNumber} was rejected. Our store team is processing your refund manually.`,
    eventType: EVENT_TYPES.REFUND_FAILED,
    referenceType: 'ORDER',
    referenceId: payload.orderNumber,
    metadata: payload
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
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      type: 'INVENTORY',
      title: '⚠️ Low Stock Alert',
      message: `Product "${payload.productName}" inventory is low (${payload.currentStock} remaining).`,
      eventType: EVENT_TYPES.LOW_STOCK,
      referenceType: 'PRODUCT',
      referenceId: payload.productId,
      metadata: payload
    });
  }
});

// Customer & Admin API Services
const getUserNotifications = async (userId, queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase && isUuid(userId)) {
    const { data, count, error } = await supabase.from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
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

  const filtered = mockNotifications.filter(n => n.userId === userId);
  return formatPaginatedResponse(filtered, page, limit, filtered.length);
};

const getUnreadCount = async (userId) => {
  if (supabase && isUuid(userId)) {
    const { count, error } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return { unreadCount: count || 0 };
  }

  const count = mockNotifications.filter(n => n.userId === userId && !n.isRead).length;
  return { unreadCount: count };
};

const markAsRead = async (userId, notificationId) => {
  if (supabase && isUuid(userId)) {
    await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  } else {
    const n = mockNotifications.find(x => x.id === notificationId && x.userId === userId);
    if (n) {
      n.isRead = true;
      n.readAt = new Date().toISOString();
    }
  }

  return { message: 'Notification marked as read' };
};

const markAllAsRead = async (userId) => {
  if (supabase && isUuid(userId)) {
    await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
  } else {
    mockNotifications.forEach(n => {
      if (n.userId === userId) {
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
  markAllAsRead,
  getAdminUserIds
};
