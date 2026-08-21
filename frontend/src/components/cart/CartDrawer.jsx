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
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(item.sellingPrice)} x {item.quantity}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <QuantitySelector
                    quantity={item.quantity}
                    onChange={(q) => updateQuantity(item.id, q)}
                    size="sm"
                  />
                  <button onClick={() => removeItem(item.id)} style={{ color: 'var(--color-error)' }}>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '16px' }}>
              Delivery charges calculated at checkout (FREE $\le$ 1 KM)
            </span>
            <Button variant="primary" fullWidth icon={ArrowRight} onClick={handleCheckoutClick}>
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};
