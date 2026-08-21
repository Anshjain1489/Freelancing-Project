import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, calculateDiscountPercentage } from '../../utils/formatting';
import { useCart } from '../../hooks/useCart';
import { showSuccess } from '../../utils/toast';

export const ProductQuickView = ({ product, isOpen, onClose }) => {
  const { addItem } = useCart();

  if (!product) return null;

  const discount = calculateDiscountPercentage(product.mrp || product.mrpPrice, product.sellingPrice);

  const handleAddToCart = () => {
    addItem(product, 1);
    showSuccess(`Added ${product.name} to cart 🛒`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Quick Preview" maxWidth="550px">
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          width: '180px',
          height: '180px',
          backgroundColor: '#F9FAFB',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <img
            src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
            alt={product.name}
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {discount > 0 && <Badge variant="orange">{discount}% OFF</Badge>}
            <StatusBadge status={product.stockStatus || 'IN_STOCK'} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{product.name}</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Brand: {product.brand || 'Kirana'} • Unit: {product.unitValue} {product.unit}
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '8px' }}>
            {formatCurrency(product.sellingPrice)}
            {(product.mrp || product.mrpPrice) > product.sellingPrice && (
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textDecoration: 'line-through', marginLeft: '8px' }}>
                {formatCurrency(product.mrp || product.mrpPrice)}
              </span>
            )}
          </div>
          <Button variant="primary" onClick={handleAddToCart} style={{ marginTop: '16px' }}>
            Add to Cart 🛒
          </Button>
        </div>
      </div>
    </Modal>
  );
};
