import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategoryImage } from '../../utils/categoryImages';

export const Categories = () => {
  const navigate = useNavigate();
  const categories = [
    'Atta & Grains', 'Rice & Pulses', 'Oil & Ghee', 'Spices', 'Snacks',
    'Biscuits', 'Beverages', 'Dairy', 'Personal Care', 'Cleaning & Household',
    'Instant Food', 'Daily Essentials'
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Shop by Category</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
        {categories.map((cat, idx) => (
          <div
            key={idx}
            onClick={() => navigate(`/products?category=${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}
            style={{
              padding: '18px 12px',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              fontWeight: 800,
              color: 'var(--color-primary-dark)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 10px auto',
              border: '2px solid var(--color-mint)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
              backgroundColor: '#F8F9FA'
            }}>
              <img
                src={getCategoryImage(cat)}
                alt={cat}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontSize: '0.9rem' }}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
