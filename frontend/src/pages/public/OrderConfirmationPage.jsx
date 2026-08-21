import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { orderService } from '../../services/order.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { CheckCircle2, ShoppingBag, MapPin, Truck } from 'lucide-react';

export const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fire celebratory confetti on confirmation screen
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const fetchOrder = async () => {
      try {
        const res = await orderService.getOrderById(orderId);
        setOrder(res.data?.order || null);
      } catch (err) {
        console.error('Failed to load order confirmation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '650px', margin: '40px auto', padding: '16px' }}>
        <Skeleton height="300px" borderRadius="16px" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '650px', margin: '20px auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Card padding="32px" style={{ textAlign: 'center', backgroundColor: 'var(--color-mint-light)', border: '1px solid var(--color-primary-light)' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <CheckCircle2 size={40} />
        </div>

        <h1 className="text-h1" style={{ color: 'var(--color-primary-dark)' }}>
          🎉 Order Confirmed!
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Thank you for shopping with Chaudhary Kirana Store, Mahruni.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Order Number: {order?.orderNumber}</span>
          <StatusBadge status={order?.status || 'CONFIRMED'} />
          <StatusBadge status={order?.paymentStatus || 'PAID'} />
        </div>
      </Card>

      {/* Itemized Order Details */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>Purchased Items</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {order?.items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>{item.product_name || item.name} x {item.quantity}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(item.total_price || item.itemTotal)}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(order?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Fee</span>
            <span>{order?.deliveryCharge === 0 ? 'FREE' : formatCurrency(order?.deliveryCharge)}</span>
          </div>
          <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
            <span>Total Paid</span>
            <span>{formatCurrency(order?.totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Delivery Address Snapshot */}
      {order?.address && (
        <Card padding="20px">
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={16} color="var(--color-primary)" /> Delivery Location
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <strong>{order.address.recipient_name || order.address.recipientName}</strong> ({order.address.phone})<br />
            {order.address.address_line1 || order.address.addressLine1}, {order.address.city}, {order.address.state} - {order.address.postal_code || order.address.postalCode}
          </p>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="outline" fullWidth onClick={() => navigate('/products')}>
          Continue Shopping
        </Button>
        <Button variant="primary" fullWidth onClick={() => navigate('/orders')}>
          View My Orders
        </Button>
      </div>
    </div>
  );
};
