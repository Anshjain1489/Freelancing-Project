import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Bell, CheckCheck, ShoppingBag, ArrowRight } from 'lucide-react';

export const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, loading, fetchNotifications, markOneRead, markAllRead } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (item) => {
    if (!item.isRead) markOneRead(item.id);
    if (item.referenceType === 'ORDER' && item.referenceId) {
      navigate(`/orders`);
    } else {
      navigate('/notifications');
    }
    if (onClose) onClose();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '340px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border)',
        zIndex: 1100,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={18} color="var(--color-primary)" /> Notifications
        </div>
        <button
          onClick={markAllRead}
          style={{ fontSize: '0.75rem', color: 'var(--color-primary-dark)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Loading updates...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            <ShoppingBag size={32} color="var(--color-text-tertiary)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            No new notifications
          </div>
        ) : (
          notifications.slice(0, 5).map(item => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: item.isRead ? 'transparent' : 'var(--color-mint-light)',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ fontWeight: item.isRead ? 600 : 800, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {item.message}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '10px 16px', backgroundColor: 'var(--color-surface-subtle)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
        <button
          onClick={() => { navigate('/notifications'); if (onClose) onClose(); }}
          style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View All Notifications →
        </button>
      </div>
    </div>
  );
};
