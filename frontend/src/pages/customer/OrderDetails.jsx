import React from 'react';
import { useParams } from 'react-router-dom';

export const OrderDetails = () => {
  const { id } = useParams();
  return (
    <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>Order Details: {id}</h3>
      <p style={{ color: 'var(--color-text-secondary)' }}>Status timeline and invoice breakdown placeholder (Phase 8 integration)</p>
    </div>
  );
};
