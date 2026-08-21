import React from 'react';

export const Categories = () => {
  const categories = [
    'Atta & Grains', 'Rice & Pulses', 'Oil & Ghee', 'Spices', 'Snacks',
    'Biscuits', 'Beverages', 'Dairy', 'Personal Care', 'Cleaning & Household',
    'Instant Food', 'Daily Essentials'
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Shop by Category</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {categories.map((cat, idx) => (
          <div key={idx} style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
            fontWeight: 700,
            color: 'var(--color-primary-dark)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌾</div>
            <span>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
