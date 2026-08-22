import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { RazorpayCheckoutButton } from '../../components/payment/RazorpayCheckoutButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { MapPin, RefreshCw, XCircle } from 'lucide-react';

export const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [retryPayload, setRetryPayload] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await orderService.getOrderById(orderId);
      setOrder(res.data?.order || null);
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    try {
      await orderService.cancelOrder(order.id, 'Cancelled by customer');
      showSuccess('Order cancelled successfully');
      fetchOrder();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const res = await orderService.retryPayment(order.id);
      setRetryPayload(res.data);
      showSuccess('Payment portal ready! Proceeding to payment...');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '750px', margin: '0 auto', padding: '16px' }}>
        <Skeleton height="300px" borderRadius="16px" />
      </div>
    );
  }

  if (!order) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Order not found.</div>;
  }

  const canCancel = ['PENDING_PAYMENT', 'CONFIRMED'].includes(order.status);
  const canRetry = order.paymentStatus === 'PENDING' || order.status === 'PAYMENT_FAILED';

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Orders', to: '/orders' }, { label: `Order #${order.orderNumber}` }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Order #{order.orderNumber}</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Placed on: {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Customer Order Decision Status Message Banner */}
      {order.status === 'CONFIRMED' && (
        <Card padding="16px" style={{ background: '#E8F7F0', border: '1px solid #06C167', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 700, color: '#06C167', fontSize: '0.9rem' }}>
            ⏳ Order Awaiting Confirmation
          </div>
          <div style={{ fontSize: '0.85rem', color: '#2C3E50', marginTop: '2px' }}>
            Your order has been received and is awaiting store confirmation.
          </div>
        </Card>
      )}

      {order.status === 'PROCESSING' && (
        <Card padding="16px" style={{ background: '#E8F7F0', border: '1px solid #06C167', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 700, color: '#06C167', fontSize: '0.9rem' }}>
            ✅ Order Accepted!
          </div>
          <div style={{ fontSize: '0.85rem', color: '#2C3E50', marginTop: '2px' }}>
            Your order has been accepted and is being prepared.
          </div>
        </Card>
      )}

      {order.status === 'REJECTED' && (
        <Card padding="16px" style={{ background: '#FFF5F5', border: '1px solid #E74C3C', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 700, color: '#C0392B', fontSize: '0.9rem' }}>
            ❌ Order Rejected
          </div>
          <div style={{ fontSize: '0.85rem', color: '#2C3E50', marginTop: '2px' }}>
            Unfortunately, your order could not be accepted.
            {order.rejectionReason && (
              <div style={{ marginTop: '4px', fontWeight: 600, color: '#C0392B' }}>
                Reason: {order.rejectionReason}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Payment Retry Action Banner */}
      {canRetry && (
        <Card padding="20px" style={{ backgroundColor: '#FFF0E6', border: '1px solid #FFD8BE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                ⚠️ Payment Pending or Failed
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Complete payment to confirm order dispatch from Chaudhary Kirana Store.
              </p>
            </div>
            {retryPayload ? (
              <RazorpayCheckoutButton orderDetails={retryPayload} />
            ) : (
              <Button variant="secondary" size="sm" loading={retrying} icon={RefreshCw} onClick={handleRetryPayment}>
                Retry Payment (₹{order.totalAmount})
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Itemized Order Items */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>Order Items</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {order.items?.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <div>
                <span style={{ fontWeight: 700 }}>{item.product_name || item.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                  {formatCurrency(item.unit_price || item.sellingPrice)} x {item.quantity}
                </span>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                {formatCurrency(item.total_price || item.itemTotal)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Charge</span>
            <span>{order.deliveryCharge === 0 ? 'FREE' : formatCurrency(order.deliveryCharge)}</span>
          </div>
          <div style={{ borderTop: '1.5px dashed var(--color-primary)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
            <span>Total Amount</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Delivery Address Snapshot */}
      {order.address && (
        <Card padding="20px">
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} color="var(--color-primary)" /> Delivery Location
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <strong>{order.address.recipient_name || order.address.recipientName}</strong> ({order.address.phone})<br />
            {order.address.address_line1 || order.address.addressLine1}, {order.address.city}, {order.address.state} - {order.address.postal_code || order.address.postalCode}
          </p>
        </Card>
      )}

      {/* Actions */}
      {canCancel && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="danger" size="sm" icon={XCircle} onClick={() => setIsCancelModalOpen(true)}>
            Cancel Order
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order?"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, Cancel Order"
        danger
      />
    </div>
  );
};
