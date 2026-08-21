import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  disabled = false,
  required = false,
  fullWidth = true,
  style = {},
  ...props
}) => {
  return (
    <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {label} {required && <span style={{ color: 'var(--color-error)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <Icon size={18} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-secondary)' }} />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: Icon ? '10px 12px 10px 38px' : '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
            backgroundColor: disabled ? 'var(--color-background)' : 'var(--color-surface)',
            fontSize: '0.9rem',
            color: 'var(--color-text-primary)',
            transition: 'border-color var(--transition-fast)',
            ...style
          }}
          {...props}
        />
      </div>
      {error ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>{error}</span>
      ) : helperText ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};
