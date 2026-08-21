import React from 'react';

export const Notifications = () => {
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>In-App Notifications</h3>
      <div style={{ padding: '12px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
        🎉 Your order #CKS-9921 has been confirmed by Chaudhary Kirana Store!
      </div>
    </div>
  );
};
