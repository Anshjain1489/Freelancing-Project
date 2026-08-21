import React, { useState } from 'react';

export const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '6px',
          padding: '4px 8px',
          backgroundColor: '#1F2937',
          color: '#ffffff',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
          zIndex: 200
        }}>
          {text}
        </div>
      )}
    </div>
  );
};
