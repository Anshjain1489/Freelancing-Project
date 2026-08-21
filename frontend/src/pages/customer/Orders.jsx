import React from 'react';

export const Orders = () => {
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>My Grocery Orders</h3>
      <div style={{ padding: '16px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-mint-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <strong>Order #CKS-9921</strong>
          <span className="badge-orange">CONFIRMED</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Items: Aashirvaad Atta 5kg, Fortune Oil 1L | Total: ₹490</p>
      </div>
    </div>
  );
};
