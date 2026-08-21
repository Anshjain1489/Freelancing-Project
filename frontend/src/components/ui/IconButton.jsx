import React from 'react';

export const IconButton = ({
  icon: Icon,
  onClick,
  title = '',
  variant = 'ghost',
  size = 'md',
  disabled = false,
  style = {},
  ...props
}) => {
  const getPadding = () => {
    switch (size) {
      case 'sm': return '6px';
      case 'lg': return '12px';
      case 'md': default: return '8px';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 16;
      case 'lg': return 24;
      case 'md': default: return 20;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        padding: getPadding(),
        color: 'var(--color-text-primary)',
        transition: 'all var(--transition-fast)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
      {...props}
    >
      <Icon size={getIconSize()} />
    </button>
  );
};
