import React, { useState } from 'react';

export const Dropdown = ({ trigger, items = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '6px',
            minWidth: '160px',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 150,
            overflow: 'hidden'
          }}
          onClick={() => setIsOpen(false)}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              onClick={item.onClick}
              style={{
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: idx < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                color: item.danger ? 'var(--color-error)' : 'var(--color-text-primary)'
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
