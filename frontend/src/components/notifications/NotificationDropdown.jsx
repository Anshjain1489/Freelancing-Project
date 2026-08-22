import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { AuthContext } from '../../context/AuthContext';
import { Bell, CheckCheck, ShoppingBag, AlertTriangle, Tag } from 'lucide-react';

export const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { notifications, loading, fetchNotifications, markOneRead, markAllRead } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (item) => {
    if (!item.isRead) markOneRead(item.id);

    if (user?.role === 'ADMIN') {
      if (item.type === 'INVENTORY' || item.referenceType === 'PRODUCT') {
        navigate('/admin/inventory');
      } else {
        navigate('/admin/orders');
      }
    } else {
      if (item.referenceType === 'ORDER') {
        navigate('/orders');
      } else {
        navigate('/notifications');
      }
    }
    if (onClose) onClose();
  };

  const getIcon = (item) => {
    if (item.type === 'INVENTORY' || item.eventType === 'LOW_STOCK') {
      return <AlertTriangle size={16} color="#FF6B00" />;
    }
    if (item.type === 'PROMOTION') {
      return <Tag size={16} color="#FF6B00" />;
    }
    return <ShoppingBag size={16} color="#06C167" />;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '340px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        border: '1px solid #E5E7EB',
        zIndex: 1100,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#1F2937' }}>
          <Bell size={18} color="#06C167" /> Notifications
        </div>
        <button
          onClick={markAllRead}
          style={{ fontSize: '0.75rem', color: '#06C167', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#6B7280' }}>
            Loading updates...
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
            <ShoppingBag size={32} color="#9CA3AF" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            No new notifications
          </div>
        ) : (
          notifications.slice(0, 6).map(item => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F3F4F6',
                backgroundColor: item.isRead ? '#ffffff' : '#E8F7F0',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {getIcon(item)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: item.isRead ? 600 : 800, fontSize: '0.85rem', color: '#1F2937' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4B5563', marginTop: '2px', lineHeight: 1.3 }}>
                  {item.message}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '4px' }}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '10px 16px', backgroundColor: '#FAFAFA', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
        <button
          onClick={() => {
            if (user?.role === 'ADMIN') {
              navigate('/admin/orders');
            } else {
              navigate('/notifications');
            }
            if (onClose) onClose();
          }}
          style={{ fontSize: '0.8rem', fontWeight: 700, color: '#06C167', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View All Notifications →
        </button>
      </div>
    </div>
  );
};
