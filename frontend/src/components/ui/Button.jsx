import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  onClick,
  type = 'button',
  fullWidth = false,
  style = {},
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--color-secondary)',
          color: '#ffffff',
          border: 'none',
          boxShadow: 'var(--shadow-sm)'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          border: '1.5px solid var(--color-primary)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          border: 'none'
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-error)',
          color: '#ffffff',
          border: 'none'
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success)',
          color: '#ffffff',
          border: 'none'
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          border: 'none',
          boxShadow: 'var(--shadow-sm)'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '0.8rem', minHeight: '32px' };
      case 'lg':
        return { padding: '14px 28px', fontSize: '1rem', minHeight: '48px' };
      case 'md':
      default:
        return { padding: '10px 20px', fontSize: '0.9rem', minHeight: '40px' };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 700,
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
        opacity: disabled || loading ? 0.65 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : 'auto',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
      }}
      className={`text-button ${className}`}
      {...props}
    >
      {loading ? (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'pulse 1s infinite linear'
        }} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : null}
      <span>{children}</span>
    </button>
  );
};
