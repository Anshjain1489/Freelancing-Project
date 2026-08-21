import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import { Drawer } from '../ui/Drawer';
import { QuantitySelector } from '../ui/QuantitySelector';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { formatCurrency } from '../../utils/formatting';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const { cartItems, itemCount, subtotal, isDrawerOpen, closeCart, updateQuantity, removeItem } = useContext(CartContext);

  const handleCheckoutClick = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <Drawer isOpen={isDrawerOpen} onClose={closeCart} title={`Your Cart (${itemCount})`}>
      {cartItems.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty!"
          description="Add fresh groceries to get fast local delivery."
          actionLabel="Start Shopping"
          onAction={() => {
            closeCart();
            navigate('/products');
          }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          {/* Cart Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {cartItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#F9FAFB',
                  flexShrink: 0
                }}>
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
                    alt={item.name}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2 }}>{item.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(item.sellingPrice)} x {item.quantity}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QuantitySelector
                    quantity={item.quantity}
                    onChange={(q) => updateQuantity(item.id, q)}
                    size="sm"
                  />
                  <button onClick={() => removeItem(item.id)} style={{ color: 'var(--color-error)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Drawer Footer */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: '1.1rem' }}>
                {formatCurrency(subtotal)}
              </span>
            </div>

            {subtotal < 199 ? (
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                🛍️ Minimum Order is ₹199 (Add ₹{(199 - subtotal).toFixed(0)} more)
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '12px' }}>
                Delivery charges calculated at checkout (🛵 Fast Delivery ₹10/KM)
              </span>
            )}

            <Button
              variant={subtotal >= 199 ? 'primary' : 'outline'}
              fullWidth
              icon={ArrowRight}
              onClick={handleCheckoutClick}
              disabled={subtotal < 199}
            >
              {subtotal >= 199 ? 'Proceed to Checkout' : `Add ₹${(199 - subtotal).toFixed(0)} More to Checkout`}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
