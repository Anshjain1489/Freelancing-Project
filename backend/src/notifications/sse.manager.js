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

// Send keep-alive heartbeat ping every 25 seconds for Render deployment compatibility
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

module.exports = {
  addClient,
  removeClient,
  broadcastNotification,
  broadcastDecision
};
