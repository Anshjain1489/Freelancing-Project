import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/formatting';
import { calculateDeliveryFee } from '../../services/distance';

export const Checkout = () => {
  const { cartItems, subtotal } = useCart();
  const [distanceKm, setDistanceKm] = useState(0.8);

  const delivery = calculateDeliveryFee(distanceKm);
  const totalAmount = subtotal + delivery.deliveryCharge;

  return (
    <div style={{ padding: '24px 0', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '16px' }}>Checkout Order</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Delivery Address & Distance */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>1. Delivery Address</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Near Bada Jain Mandir Area, Mahruni
          </p>

          <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
            Simulated Distance from Store (KM):
          </label>
          <input
            type="number"
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '12px' }}
          />

          <div style={{
            padding: '12px',
            backgroundColor: delivery.isFree ? 'var(--color-mint)' : 'var(--color-orange-light)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: delivery.isFree ? 'var(--color-primary-dark)' : 'var(--color-secondary)'
          }}>
            {delivery.message}
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>2. Order Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
            <span>Items Subtotal</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
            <span>Delivery Fee</span>
            <span style={{ fontWeight: 700, color: delivery.isFree ? 'var(--color-primary-dark)' : 'inherit' }}>
              {delivery.isFree ? 'FREE' : formatCurrency(delivery.deliveryCharge)}
            </span>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
            <span>Total Payable</span>
            <span style={{ color: 'var(--color-primary-dark)' }}>{formatCurrency(totalAmount)}</span>
          </div>

          <button style={{
            width: '100%',
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '1rem'
          }}>
            Pay via Razorpay 💳
          </button>
        </div>
      </div>
    </div>
  );
};
