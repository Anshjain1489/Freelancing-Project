import React from 'react';

export const Textarea = ({
  label,
  error,
  rows = 3,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  required = false,
  style = {},
  ...props
}) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          backgroundColor: disabled ? 'var(--color-background)' : 'var(--color-surface)',
          fontSize: '0.9rem',
          resize: 'vertical',
          ...style
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>{error}</span>}
    </div>
  );
};
