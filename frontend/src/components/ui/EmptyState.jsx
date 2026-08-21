import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = ShoppingBag,
  title = 'No items found',
  description = 'There are no records available right now.',
  actionLabel,
  onAction
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        padding: '16px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-mint)',
        color: 'var(--color-primary-dark)'
      }}>
        <Icon size={36} />
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} style={{ marginTop: '8px' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
