import React from 'react';

export const Spinner = ({ size = 24, color = 'var(--color-primary)' }) => {
  return (
    <span
      className="animate-pulse"
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        border: `3px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%'
      }}
    />
  );
};
