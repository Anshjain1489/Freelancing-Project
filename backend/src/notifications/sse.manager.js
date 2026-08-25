const logger = require('../utils/logger');

// Map of userId -> Set of Express res response objects
const sseClients = new Map();

/**
 * Register a client SSE connection
 */
const addClient = (userId, userRole, res) => {
  const strUserId = String(userId);
  if (!sseClients.has(strUserId)) {
    sseClients.set(strUserId, new Set());
  }
  sseClients.get(strUserId).add(res);

  res.userRole = userRole;
  res.userId = strUserId;

  logger.info(`[SSE] Client connected: userId=${strUserId}, role=${userRole}. Total streams for user: ${sseClients.get(strUserId).size}`);

  const cleanup = () => {
    removeClient(strUserId, res);
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);
};

/**
 * Unregister ONLY the specific closed connection `res`
 */
const removeClient = (userId, res) => {
  const strUserId = String(userId);
  if (sseClients.has(strUserId)) {
    const userSet = sseClients.get(strUserId);
    userSet.delete(res);
    if (userSet.size === 0) {
      sseClients.delete(strUserId);
    }
  }
};

/**
 * Send an SSE payload to ALL active connections belonging to a specific user (Multi-Tab Support)
 */
const sendToUser = (userId, payload) => {
  const strUserId = String(userId);
  if (!sseClients.has(strUserId)) return false;

  const clientsSet = sseClients.get(strUserId);
  let sentCount = 0;

  clientsSet.forEach(res => {
    if (!res.writable || res.destroyed || res.writableEnded) {
      removeClient(strUserId, res);
      return;
    }

    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      sentCount++;
    } catch (err) {
      logger.error(`[SSE_SEND_TO_USER_ERR] Failed for userId=${strUserId}`, err);
      removeClient(strUserId, res);
    }
  });

  return sentCount > 0;
};

/**
 * Broadcast an SSE payload to ALL connected Admin dashboard connections
 */
const broadcastToAdmins = (payload) => {
  let sentCount = 0;
  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
        removeClient(userId, res);
        return;
      }
      if (res.userRole === 'ADMIN') {
        try {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
          sentCount++;
        } catch (err) {
          logger.error(`[SSE_BROADCAST_ADMIN_ERR] Failed for userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
  return sentCount;
};

/**
 * Broadcast notification payload to matching SSE clients
 */
const broadcastNotification = (notification) => {
  if (!notification || typeof notification !== 'object') return;
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
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        } catch (err) {
          logger.error(`[SSE_BROADCAST_ERROR] Failed to send to userId=${userId}`, err);
          removeClient(userId, res);
        }
      }
    });
  });
};

/**
 * Broadcast order decision update to Admins and the target Customer
 */
const broadcastDecision = (decision) => {
  const targetUserId = decision.userId || decision.user_id;
  const payload = {
    eventType: 'ORDER_DECISION_UPDATED',
    type: 'ORDER_DECISION',
    ...decision
  };

  if (targetUserId) {
    sendToUser(targetUserId, payload);
  }
  broadcastToAdmins(payload);
};

/**
 * Broadcast real-time order status update to all Admins and targeted Customer
 */
const broadcastOrderStatusUpdate = (statusUpdate) => {
  const targetUserId = statusUpdate.userId || statusUpdate.user_id;
  const payload = {
    eventType: 'ORDER_STATUS_UPDATED',
    type: 'ORDER_STATUS_UPDATED',
    ...statusUpdate
  };

  if (targetUserId) {
    sendToUser(targetUserId, payload);
  }
  broadcastToAdmins(payload);
};

/**
 * Broadcast real-time delivery update to Admins, assigned Partner, and Customer
 */
const broadcastDeliveryUpdate = (deliveryUpdate) => {
  const customerId = deliveryUpdate.customerId || deliveryUpdate.user_id || deliveryUpdate.userId;
  const partnerId = deliveryUpdate.deliveryPartnerId || deliveryUpdate.delivery_partner_id;

  const payload = {
    eventType: deliveryUpdate.eventType || 'DELIVERY_UPDATED',
    type: 'DELIVERY_UPDATED',
    ...deliveryUpdate
  };

  delete payload.delivery_otp_hash;
  delete payload.deliveryOtpHash;
  delete payload.delivery_otp_encrypted;
  delete payload.deliveryOtpEncrypted;

  if (customerId) sendToUser(customerId, payload);
  if (partnerId) sendToUser(partnerId, payload);
  broadcastToAdmins(payload);
};

const broadcastInventoryUpdate = (inventoryUpdate) => {
  broadcastToAdmins({
    eventType: 'INVENTORY_UPDATED',
    type: 'INVENTORY_UPDATED',
    ...inventoryUpdate
  });
};

const broadcastCancellationUpdate = (cancellationUpdate) => {
  const customerId = cancellationUpdate.customerId || cancellationUpdate.user_id || cancellationUpdate.userId;
  const payload = {
    eventType: 'ORDER_CANCELLED',
    type: 'ORDER_CANCELLED',
    ...cancellationUpdate
  };
  if (customerId) sendToUser(customerId, payload);
  broadcastToAdmins(payload);
};

const broadcastReturnUpdate = (returnUpdate) => {
  const customerId = returnUpdate.customerId || returnUpdate.user_id || returnUpdate.userId;
  const payload = {
    eventType: 'RETURN_UPDATED',
    type: 'RETURN_UPDATED',
    ...returnUpdate
  };
  if (customerId) sendToUser(customerId, payload);
  broadcastToAdmins(payload);
};

const broadcastReplacementUpdate = (replacementUpdate) => {
  const customerId = replacementUpdate.customerId || replacementUpdate.user_id || replacementUpdate.userId;
  const payload = {
    eventType: 'REPLACEMENT_UPDATED',
    type: 'REPLACEMENT_UPDATED',
    ...replacementUpdate
  };
  if (customerId) sendToUser(customerId, payload);
  broadcastToAdmins(payload);
};

const broadcastReturnPickupUpdate = (pickupUpdate) => {
  const partnerId = pickupUpdate.deliveryPartnerId || pickupUpdate.delivery_partner_id;
  const payload = {
    eventType: 'RETURN_PICKUP_UPDATED',
    type: 'RETURN_PICKUP_UPDATED',
    ...pickupUpdate
  };
  if (partnerId) sendToUser(partnerId, payload);
  broadcastToAdmins(payload);
};

const broadcastOrderTrackingUpdate = (trackingUpdate) => {
  const customerId = trackingUpdate.customerId || trackingUpdate.user_id || trackingUpdate.userId;
  const payload = {
    eventType: 'ORDER_TRACKING_UPDATED',
    type: 'ORDER_TRACKING_UPDATED',
    ...trackingUpdate
  };
  if (customerId) sendToUser(customerId, payload);
  broadcastToAdmins(payload);
};

// Send keep-alive heartbeat ping every 25 seconds for Render/Cloud deployment compatibility
setInterval(() => {
  sseClients.forEach((clientsSet, userId) => {
    clientsSet.forEach(res => {
      if (!res.writable || res.destroyed || res.writableEnded) {
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

/**
 * Enhanced getStats() for Phase 27 & 28 Readiness Diagnostics
 */
const getStats = () => {
  let activeConnections = 0;
  let adminConnections = 0;
  let customerConnections = 0;
  let deliveryPartnerConnections = 0;

  sseClients.forEach((clientsSet) => {
    clientsSet.forEach(res => {
      activeConnections++;
      if (res.userRole === 'ADMIN') adminConnections++;
      else if (res.userRole === 'CUSTOMER') customerConnections++;
      else if (res.userRole === 'DELIVERY_PARTNER') deliveryPartnerConnections++;
    });
  });

  return {
    activeUsers: sseClients.size,
    activeConnections,
    adminConnections,
    customerConnections,
    deliveryPartnerConnections,
    // Legacy backwards compatibility keys
    activeUsersCount: sseClients.size,
    totalConnectionsCount: activeConnections
  };
};

const clearForTests = () => {
  sseClients.clear();
};

module.exports = {
  addClient,
  removeClient,
  sendToUser,
  broadcastToAdmins,
  getStats,
  clearForTests,
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
