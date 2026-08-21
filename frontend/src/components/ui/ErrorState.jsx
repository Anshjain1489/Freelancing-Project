import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({
  message = 'Something went wrong while fetching data.',
  onRetry
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '32px 20px',
      backgroundColor: '#FEE2E2',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid #FCA5A5',
      color: '#DC2626',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <AlertCircle size={36} />
      <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Error Occurred</h4>
      <p style={{ fontSize: '0.85rem', maxWidth: '400px' }}>{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
