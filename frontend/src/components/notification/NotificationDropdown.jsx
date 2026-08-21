import React from 'react';
import { CheckCircle2, ShoppingBag, Tag, Bell } from 'lucide-react';

export const NotificationDropdown = ({ onClose }) => {
  const mockNotifications = [
    { id: '1', title: 'Order Confirmed 🎉', message: 'Order #CKS-9921 confirmed by store owner.', type: 'ORDER', unread: true, time: '10m ago' },
    { id: '2', title: 'New Offer 🔥', message: 'Flat ₹50 OFF on monthly ration orders using MAHRUNI50.', type: 'PROMOTION', unread: true, time: '1h ago' }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '8px',
        width: '320px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 250,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: '0.95rem', backgroundColor: 'var(--color-mint-light)' }}>
        Notifications
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {mockNotifications.map(n => (
          <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', backgroundColor: n.unread ? 'var(--color-mint-light)' : 'transparent', display: 'flex', gap: '10px' }}>
            {n.type === 'ORDER' ? <ShoppingBag size={18} color="var(--color-primary-dark)" /> : <Tag size={18} color="var(--color-secondary)" />}
            <div>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{n.title}</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{n.message}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
