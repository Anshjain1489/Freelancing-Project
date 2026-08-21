import React from 'react';
import { Button } from '../ui/Button';

export const PromotionalBanner = ({
  title = '🛒 रोज़मर्रा का सामान, अब आपके घर तक!',
  subtitle = 'Fresh groceries. Fair prices. Fast local delivery in Mahruni.',
  badge = '🟢 1 KM तक FREE Delivery!',
  ctaText = 'Shop Now',
  onCtaClick
}) => {
  return (
    <div style={{
      backgroundColor: 'var(--color-mint)',
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--color-mint-border)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div>
        <span className="badge-orange">{badge}</span>
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '600px' }}>
        {subtitle}
      </p>
      {ctaText && (
        <div>
          <Button variant="primary" onClick={onCtaClick}>
            {ctaText}
          </Button>
        </div>
      )}
    </div>
  );
};
