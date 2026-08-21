import React from 'react';

export const QuantitySelector = ({
  quantity = 1,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
  loading = false,
  size = 'md'
}) => {
  const handleDecrease = (e) => {
    e.stopPropagation();
    if (quantity > min) {
      onChange(quantity - 1);
    }
  };

  const handleIncrease = (e) => {
    e.stopPropagation();
    if (quantity < max) {
      onChange(quantity + 1);
    }
  };

  const getHeight = () => size === 'sm' ? '28px' : '36px';
  const getPadding = () => size === 'sm' ? '0 8px' : '0 12px';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1.5px solid var(--color-primary)',
        backgroundColor: 'var(--color-mint)',
        borderRadius: 'var(--radius-md)',
        height: getHeight(),
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <button
        type="button"
        onClick={handleDecrease}
        disabled={disabled || quantity <= min || loading}
        style={{
          padding: getPadding(),
          height: '100%',
          fontWeight: 800,
          fontSize: '1rem',
          color: 'var(--color-primary-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: quantity <= min ? 'not-allowed' : 'pointer'
        }}
      >
        −
      </button>

      <span style={{
        padding: '0 8px',
        fontWeight: 800,
        fontSize: size === 'sm' ? '0.8rem' : '0.9rem',
        color: 'var(--color-primary-dark)',
        minWidth: '24px',
        textAlign: 'center'
      }}>
        {loading ? '...' : quantity}
      </span>

      <button
        type="button"
        onClick={handleIncrease}
        disabled={disabled || quantity >= max || loading}
        style={{
          padding: getPadding(),
          height: '100%',
          fontWeight: 800,
          fontSize: '1rem',
          color: 'var(--color-primary-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: quantity >= max ? 'not-allowed' : 'pointer'
        }}
      >
        +
      </button>
    </div>
  );
};
