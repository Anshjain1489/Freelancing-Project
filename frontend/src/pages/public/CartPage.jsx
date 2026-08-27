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

        {/* P2-16: Empty Cart Shortcut Chips */}
        <div style={{ marginTop: '24px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '12px' }}>
            Browse Popular Categories 🛒
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { name: 'Atta & Grains', slug: 'atta-grains' },
              { name: 'Rice & Pulses', slug: 'rice-pulses' },
              { name: 'Snacks & Munchies', slug: 'snacks-munchies' },
              { name: 'Dairy & Fresh', slug: 'dairy-fresh' },
              { name: 'Beverages', slug: 'beverages' }
            ].map(cat => (
              <button
                key={cat.slug}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                style={{
                  padding: '8px 14px',
                  background: '#FFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const FREE_DELIVERY_THRESHOLD = 499;
  const freeDeliveryProgress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Shopping Cart' }]} />

      {/* P2-6: Free Delivery Eligibility Progress Bar */}
      <div style={{
        background: subtotal >= FREE_DELIVERY_THRESHOLD ? '#ECFDF5' : '#EFF6FF',
        border: `1px solid ${subtotal >= FREE_DELIVERY_THRESHOLD ? '#6EE7B7' : '#BFDBFE'}`,
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 800 }}>
          <span>
            {subtotal >= FREE_DELIVERY_THRESHOLD
              ? '🎉 You qualify for free delivery!'
              : `Add ₹${(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(0)} more to qualify for free delivery 🎉`}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{freeDeliveryProgress}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${freeDeliveryProgress}%`,
            height: '100%',
            background: subtotal >= FREE_DELIVERY_THRESHOLD ? '#10B981' : '#3B82F6',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

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
                  <div style={{
                    width: '54px',
                    height: '54px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
                      alt={item.name}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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
            <span>Calculated at Checkout (🛵 Fast Delivery ₹10/KM)</span>
          </div>
          {subtotal < 199 && (
            <div style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              color: '#92400E',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              🛍️ Minimum Order Amount is ₹199 (Add ₹{(199 - subtotal).toFixed(0)} more to place order)
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => navigate('/products')}>
              Continue Shopping
            </Button>
            <Button
              variant={subtotal >= 199 ? 'primary' : 'outline'}
              style={{ flex: 1 }}
              icon={ArrowRight}
              onClick={() => navigate('/checkout')}
              disabled={subtotal < 199}
            >
              {subtotal >= 199 ? 'Proceed to Checkout' : `Add ₹${(199 - subtotal).toFixed(0)} More to Checkout`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
