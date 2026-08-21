import React from 'react';
import { useParams } from 'react-router-dom';

export const ProductDetails = () => {
  const { slug } = useParams();
  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Product Details</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Viewing: {slug}</p>
      <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <span>Product detail view shell placeholder</span>
      </div>
    </div>
  );
};
