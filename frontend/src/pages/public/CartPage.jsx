import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../context/CartContext';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';

export const CartPage = () => {
  const navigate = useNavigate();
  const { cartItems, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useContext(CartContext);

  if (cartItems.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty!"
          description="Looks like you haven't added any fresh groceries to your cart yet."
          actionLabel="Continue Shopping 🛒"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Shopping Cart' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-h1">Your Shopping Cart 🛒 ({itemCount} items)</h1>
        <Button variant="ghost" size="sm" icon={Trash2} onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Cart Item List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cartItems.map(item => (
            <Card key={item.id} padding="16px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '54px', height: '54px', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    🌾
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{item.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(item.sellingPrice)} per unit
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <QuantitySelector
                    quantity={item.quantity}
                    onChange={(q) => updateQuantity(item.id, q)}
                    size="sm"
                  />
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary-dark)', minWidth: '70px', textAlign: 'right' }}>
                    {formatCurrency(item.sellingPrice * item.quantity)}
                  </span>
                  <Button variant="ghost" size="sm" icon={Trash2} onClick={() => removeItem(item.id)} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary Box */}
        <Card padding="24px" style={{ backgroundColor: 'var(--color-mint-light)', border: '1px solid var(--color-primary-light)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Order Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
            <span>Subtotal ({itemCount} items)</span>
            <span style={{ fontWeight: 800 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <span>Delivery Charge</span>
            <span>Calculated at Checkout (Free $\le$ 1 KM)</span>
          </div>
          <div style={{ borderTop: '1px dashed var(--color-primary)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Estimated Subtotal</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{formatCurrency(subtotal)}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Continue Shopping
            </Button>
            <Button variant="primary" style={{ flex: 1 }} icon={ArrowRight} onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
