import React from 'react';
import { Tag, Copy } from 'lucide-react';
import { showSuccess } from '../../utils/toast';

export const CouponCard = ({ code = 'MAHRUNI50', description = 'Flat ₹50 OFF on orders above ₹999' }) => {
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    showSuccess(`Coupon code ${code} copied!`);
  };

  return (
    <div style={{
      border: '2px dashed var(--color-secondary)',
      backgroundColor: 'var(--color-secondary-light)',
      borderRadius: 'var(--radius-md)',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Tag color="var(--color-secondary)" size={24} />
        <div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{code}</span>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{description}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        style={{
          padding: '6px 12px',
          backgroundColor: 'var(--color-secondary)',
          color: '#fff',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <Copy size={14} /> Copy
      </button>
    </div>
  );
};
