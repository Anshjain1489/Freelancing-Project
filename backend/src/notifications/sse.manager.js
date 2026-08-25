const logger = require('../utils/logger');

// Map of userId -> Set of Express res response objects
const sseClients = new Map();

/**
 * Register a client SSE connection
 */
const addClient = (userId, userRole, res) => {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);

  res.userRole = userRole;
  res.userId = userId;

  logger.info(`[SSE] Client connected: userId=${userId}, role=${userRole}. Total streams for user: ${sseClients.get(userId).size}`);

  const cleanup = () => {
    removeClient(userId, res);
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);
};

/**
 * Unregister a client SSE connection
 */
const removeClient = (userId, res) => {
  if (sseClients.has(userId)) {
    const userSet = sseClients.get(userId);
    userSet.delete(res);
    if (userSet.size === 0) {
      sseClients.delete(userId);
    }
  }
};

/**
 * Broadcast notification payload to matching SSE clients
 */
const broadcastNotification = (notification) => {
  const targetUserId = notification.userId || notification.user_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetUser = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';
      const isAdminNotif = notification.eventType === 'ADMIN_NEW_ORDER' || notification.type === 'INVENTORY' || notification.eventType === 'LOW_STOCK';

      if (isTargetUser || (isAdmin && isAdminNotif)) {
        try {
          const written = res.write(`data: ${JSON.stringify(notification)}\n\n`);
          if (!written) {
            // Buffer full or client socket closed
          }
        } catch (err) {
          logger.error(`[SSE_BROADCAST_ERROR] Failed to send to userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast order decision update (ACCEPT / REJECT) to all connected Admin SSE streams
 */
const broadcastDecision = (decision) => {
  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }
      if (res.userRole === 'ADMIN') {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: 'ORDER_DECISION_UPDATED',
            type: 'ORDER_DECISION',
            ...decision
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_DECISION_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time order status update to all Admins and the targeted order owner Customer
 */
const broadcastOrderStatusUpdate = (statusUpdate) => {
  const targetUserId = statusUpdate.userId || statusUpdate.user_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetCustomer = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';

      if (isAdmin || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: 'ORDER_STATUS_UPDATED',
            type: 'ORDER_STATUS_UPDATED',
            ...statusUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_STATUS_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time delivery update to Admins, the assigned Delivery Partner, and the order owner Customer
 */
const broadcastDeliveryUpdate = (deliveryUpdate) => {
  const customerId = deliveryUpdate.customerId || deliveryUpdate.user_id || deliveryUpdate.userId;
  const partnerId = deliveryUpdate.deliveryPartnerId || deliveryUpdate.delivery_partner_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isAdmin = res.userRole === 'ADMIN';
      const isAssignedPartner = partnerId && String(userId) === String(partnerId);
      const isTargetCustomer = customerId && String(userId) === String(customerId);

      if (isAdmin || isAssignedPartner || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: deliveryUpdate.eventType || 'DELIVERY_UPDATED',
            type: 'DELIVERY_UPDATED',
            ...deliveryUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_DELIVERY_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time inventory updates strictly to connected ADMIN users only
 */
const broadcastInventoryUpdate = (inventoryUpdate) => {
  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      if (res.userRole === 'ADMIN') {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: inventoryUpdate.eventType || 'INVENTORY_UPDATED',
            type: 'INVENTORY_UPDATED',
            ...inventoryUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_INVENTORY_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time cancellation update to Admins and targeted order Customer
 */
const broadcastCancellationUpdate = (cancellationUpdate) => {
  const targetUserId = cancellationUpdate.userId || cancellationUpdate.requestedBy || cancellationUpdate.requested_by;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetCustomer = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';

      if (isAdmin || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: cancellationUpdate.eventType || 'ORDER_CANCELLATION_UPDATED',
            type: 'CANCELLATION_UPDATED',
            ...cancellationUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_CANCELLATION_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time return request update to Admins and targeted Customer
 */
const broadcastReturnUpdate = (returnUpdate) => {
  const targetUserId = returnUpdate.userId || returnUpdate.user_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetCustomer = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';

      if (isAdmin || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: returnUpdate.eventType || 'RETURN_UPDATED',
            type: 'RETURN_UPDATED',
            ...returnUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_RETURN_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time replacement update to Admins and targeted Customer
 */
const broadcastReplacementUpdate = (replacementUpdate) => {
  const targetUserId = replacementUpdate.userId || replacementUpdate.user_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetCustomer = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';

      if (isAdmin || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: replacementUpdate.eventType || 'REPLACEMENT_UPDATED',
            type: 'REPLACEMENT_UPDATED',
            ...replacementUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_REPLACEMENT_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time return pickup update to Admins, assigned Delivery Partner, and targeted Customer
 */
const broadcastReturnPickupUpdate = (pickupUpdate) => {
  const customerId = pickupUpdate.customerId || pickupUpdate.userId || pickupUpdate.user_id;
  const partnerId = pickupUpdate.deliveryPartnerId || pickupUpdate.delivery_partner_id || pickupUpdate.pickup_delivery_partner_id;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isAdmin = res.userRole === 'ADMIN';
      const isAssignedPartner = partnerId && String(userId) === String(partnerId);
      const isTargetCustomer = customerId && String(userId) === String(customerId);

      if (isAdmin || isAssignedPartner || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: pickupUpdate.eventType || 'RETURN_PICKUP_UPDATED',
            type: 'RETURN_PICKUP_UPDATED',
            ...pickupUpdate
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_RETURN_PICKUP_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast real-time order tracking update to Admins and targeted order Customer
 */
const broadcastOrderTrackingUpdate = (trackingPayload) => {
  const targetUserId = trackingPayload.userId || trackingPayload.user_id || trackingPayload.customerId;

  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }

      const isTargetCustomer = targetUserId && String(userId) === String(targetUserId);
      const isAdmin = res.userRole === 'ADMIN';

      if (isAdmin || isTargetCustomer) {
        try {
          res.write(`data: ${JSON.stringify({
            eventType: 'ORDER_TRACKING_UPDATED',
            type: 'ORDER_TRACKING_UPDATED',
            orderId: trackingPayload.orderId,
            status: trackingPayload.status,
            message: trackingPayload.message || 'Order tracking updated',
            timestamp: trackingPayload.timestamp || new Date().toISOString()
          })}\n\n`);
        } catch (err) {
          logger.error(`[SSE_TRACKING_BROADCAST_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

// Send keep-alive heartbeat ping every 25 seconds for Render deployment compatibility
setInterval(() => {
  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }
      try {
        res.write(':ping\n\n');
      } catch (err) {
        removeClient(userId, res);
      }
    });
  });
}, 25000);

module.exports = {
  addClient,
  removeClient,
  broadcastNotification,
  broadcastDecision,
  broadcastOrderStatusUpdate,
  broadcastDeliveryUpdate,
  broadcastInventoryUpdate,
  broadcastCancellationUpdate,
  broadcastReturnUpdate,
  broadcastReplacementUpdate,
  broadcastReturnPickupUpdate,
  broadcastOrderTrackingUpdate
};
