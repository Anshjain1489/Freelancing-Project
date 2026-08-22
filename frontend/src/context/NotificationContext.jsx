import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notification.service';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { AuthContext } from './AuthContext';
import { ENDPOINTS } from '../api/endpoints';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const soundHook = useNotificationSound();
  const { playNotificationSound, markBatchProcessed } = soundHook;

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

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await notificationService.getUserNotifications();
      const items = res.data?.items || [];

      // Merge fetched items with current state using notification.id deduplication
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

      // Mark fetched notification IDs as processed to avoid sound replay on refresh
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
      return;
    }

    fetchUnreadCount();
    fetchNotifications();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount, fetchNotifications]);

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

          // 1. Deduplicated Notification Merging
          setNotifications(prev => {
            if (prev.some(n => String(n.id) === String(data.id))) return prev;
            return [data, ...prev];
          });

          // 2. Increment unread count
          setUnreadCount(prev => prev + 1);

          // 3. Play sound ONLY if current user is ADMIN and event is an admin alert
          const isAdmin = user?.role === 'ADMIN';
          const isAdminAlert = data.eventType === 'ADMIN_NEW_ORDER' || data.eventType === 'ORDER_CONFIRMED' || data.type === 'INVENTORY' || data.eventType === 'LOW_STOCK';

          if (isAdmin && isAdminAlert) {
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
  }, [isAuthenticated, user?.role, playNotificationSound]);

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
        loading,
        fetchNotifications,
        fetchUnreadCount,
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
