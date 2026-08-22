import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notification.service';
import { adminService } from '../services/admin.service';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { AuthContext } from './AuthContext';
import { ENDPOINTS } from '../api/endpoints';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unresolvedOrders, setUnresolvedOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const soundHook = useNotificationSound();
  const {
    playNotificationSound,
    markBatchProcessed,
    startIncomingOrderAlert,
    stopIncomingOrderAlert,
    syncPendingOrderAlerts
  } = soundHook;

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {}
  }, [isAuthenticated]);

  const fetchUnresolvedOrders = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      setUnresolvedOrders([]);
      syncPendingOrderAlerts([]);
      return;
    }
    try {
      const res = await adminService.getUnresolvedOrders();
      const orders = res.data?.items || [];
      setUnresolvedOrders(orders);
      syncPendingOrderAlerts(orders.map(o => o.id));
    } catch (err) {
      console.error('Failed to fetch unresolved orders:', err);
    }
  }, [isAuthenticated, user?.role, syncPendingOrderAlerts]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await notificationService.getUserNotifications();
      const items = res.data?.items || [];

      setNotifications(prev => {
        const map = new Map();
        items.forEach(n => map.set(String(n.id), n));
        prev.forEach(n => {
          if (!map.has(String(n.id))) {
            map.set(String(n.id), n);
          }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });

      markBatchProcessed(items.map(n => n.id));
    } catch {
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, markBatchProcessed]);

  // Initial fetch & fallback 30s polling
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setUnresolvedOrders([]);
      syncPendingOrderAlerts([]);
      return;
    }

    fetchUnreadCount();
    fetchNotifications();

    if (user?.role === 'ADMIN') {
      fetchUnresolvedOrders();
    }

    const interval = setInterval(() => {
      fetchUnreadCount();
      if (user?.role === 'ADMIN') {
        fetchUnresolvedOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role, fetchUnreadCount, fetchNotifications, fetchUnresolvedOrders, syncPendingOrderAlerts]);

  // Single SSE EventSource Listener per authenticated session
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken') || localStorage.getItem('cks_auth_token');
    if (!token) return;

    const streamUrl = `${API_BASE_URL}${ENDPOINTS.NOTIFICATIONS.STREAM}?token=${encodeURIComponent(token)}`;
    let eventSource = null;

    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || data.eventType === 'CONNECTED') return;

          // 1. Multi-Admin SSE Decision Event Synchronization
          if (data.eventType === 'ORDER_DECISION_UPDATED' || data.type === 'ORDER_DECISION') {
            const targetId = data.orderId;
            setUnresolvedOrders(prev => prev.filter(o => String(o.id) !== String(targetId) && String(o.orderNumber) !== String(targetId)));
            stopIncomingOrderAlert(targetId);
            fetchUnresolvedOrders();
            return;
          }

          // 2. Standard Notification Processing
          setNotifications(prev => {
            if (prev.some(n => String(n.id) === String(data.id))) return prev;
            return [data, ...prev];
          });

          setUnreadCount(prev => prev + 1);

          // 3. Trigger Continuous Incoming Sound for Admins
          const isAdmin = user?.role === 'ADMIN';
          const isAdminOrderAlert = data.eventType === 'ADMIN_NEW_ORDER' || data.eventType === 'ORDER_CONFIRMED';

          if (isAdmin && isAdminOrderAlert) {
            const newOrderId = data.metadata?.orderId || data.referenceId || data.orderId;
            if (newOrderId) {
              startIncomingOrderAlert(newOrderId);
              fetchUnresolvedOrders();
            } else {
              playNotificationSound(data);
            }
          } else if (isAdmin) {
            playNotificationSound(data);
          }
        } catch (err) {
          console.error('[SSE_MESSAGE_PARSER_ERROR]', err);
        }
      };

      eventSource.onerror = () => {
        // EventSource auto-reconnects
      };
    } catch (err) {
      console.error('[SSE_CONNECTION_ERROR]', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated, user?.role, playNotificationSound, startIncomingOrderAlert, stopIncomingOrderAlert, fetchUnresolvedOrders]);

  const markOneRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, isRead: true } : n));
    fetchUnreadCount();
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unresolvedOrders,
        loading,
        fetchNotifications,
        fetchUnreadCount,
        fetchUnresolvedOrders,
        markOneRead,
        markAllRead,
        ...soundHook
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
