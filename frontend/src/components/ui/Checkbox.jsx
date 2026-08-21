import React from 'react';

export const Checkbox = ({ label, checked, onChange, disabled = false, style = {} }) => {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500, ...style }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '18px',
          height: '18px',
          accentColor: 'var(--color-primary)',
          cursor: 'pointer'
        }}
      />
      <span>{label}</span>
    </label>
  );
};
