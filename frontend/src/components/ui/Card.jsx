import React from 'react';

export const Card = ({ children, padding = '16px', style = {}, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding,
        transition: 'all var(--transition-fast)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      className={className}
    >
      {children}
    </div>
  );
};
