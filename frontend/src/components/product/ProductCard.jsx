import React, { useState } from 'react';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../ui/StatusBadge';
import { QuantitySelector } from '../ui/QuantitySelector';
import { formatCurrency, calculateDiscountPercentage } from '../../utils/formatting';
import { useCart } from '../../hooks/useCart';
import { showSuccess } from '../../utils/toast';

export const ProductCard = ({ product, onQuickView }) => {
  const { cartItems, addItem, updateQuantity } = useCart();

  const cartItem = cartItems.find(item => item.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;
  const discount = calculateDiscountPercentage(product.mrp || product.mrpPrice, product.sellingPrice);

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product, 1);
    showSuccess(`Added ${product.name} to cart 🛒`);
  };

  return (
    <div
      onClick={() => onQuickView && onQuickView(product)}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        position: 'relative',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
        cursor: 'pointer'
      }}
      className="animate-fadeIn"
    >
      {/* Top Header: Offer Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        {discount > 0 ? (
          <Badge variant="orange">{discount}% OFF</Badge>
        ) : (
          <span />
        )}
        <StatusBadge status={product.stockStatus || 'IN_STOCK'} />
      </div>

      {/* Product Image */}
      <div style={{
        height: '140px',
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <img
          src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
          alt={product.name}
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
        />
      </div>

      {/* Product Title & Brand Info */}
      <div style={{ flex: 1, marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '4px' }}>
          {product.name}
        </h4>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          {product.brand || 'Kirana'} • {product.unitValue} {product.unit}
        </div>
      </div>

      {/* Footer: Price & Add/Quantity Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              {formatCurrency(product.sellingPrice)}
            </span>
            {(product.unitValue || product.unit) && (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                · {product.unitValue || ''} {product.unit || ''}
              </span>
            )}
          </div>
          {(product.mrp || product.mrpPrice) > product.sellingPrice && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
              {formatCurrency(product.mrp || product.mrpPrice)}
            </span>
          )}
        </div>

        {currentQuantity > 0 ? (
          <QuantitySelector
            quantity={currentQuantity}
            onChange={(newQty) => updateQuantity(product.id, newQty)}
            size="sm"
          />
        ) : (
          <button
            onClick={handleAdd}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--color-mint)',
              color: 'var(--color-primary-dark)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}
          >
            + ADD
          </button>
        )}
      </div>
    </div>
  );
};
