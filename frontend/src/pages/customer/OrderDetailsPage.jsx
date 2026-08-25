import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { cancellationService } from '../../services/cancellation.service';
import { returnService } from '../../services/return.service';
import { replacementService } from '../../services/replacement.service';
import { RazorpayCheckoutButton } from '../../components/payment/RazorpayCheckoutButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { MapPin, RefreshCw, XCircle, RotateCcw, Repeat, Truck } from 'lucide-react';

export const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Defective / Damaged Item');
  const [returnDesc, setReturnDesc] = useState('');
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState('Wrong Item / Quality Issue');
  const [replacementDesc, setReplacementDesc] = useState('');
  const [submittingReplacement, setSubmittingReplacement] = useState(false);

  const [retryPayload, setRetryPayload] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await orderService.getOrderById(orderId);
      const fetchedOrder = res.data?.order || null;
      setOrder(fetchedOrder);

      // Pre-fill return item selection quantities
      if (fetchedOrder && fetchedOrder.items) {
        const initialSelection = {};
        fetchedOrder.items.forEach(item => {
          initialSelection[item.id || item.product_id] = {
            selected: true,
            productId: item.product_id,
            quantity: item.quantity
          };
        });
        setSelectedReturnItems(initialSelection);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    const handleRealtimeStatus = (e) => {
      const data = e.detail;
      if (!data) return;
      const targetId = String(data.orderId || data.id || '');
      const newStatus = data.newStatus || data.status;
      if (!newStatus || !targetId) return;

      setOrder(prev => {
        if (!prev) return prev;
        if (String(prev.id) === targetId || String(prev.orderNumber) === targetId) {
          return { ...prev, status: newStatus };
        }
        return prev;
      });
    };

    window.addEventListener('cks_order_status_updated', handleRealtimeStatus);
    return () => window.removeEventListener('cks_order_status_updated', handleRealtimeStatus);
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      showError('Please provide a reason for cancellation');
      return;
    }
    setCancelling(true);
    try {
      const res = await cancellationService.requestCancellation(order.id, cancelReason);
      showSuccess(res.message || 'Cancellation processed successfully');
      setIsCancelModalOpen(false);
      setCancelReason('');
      fetchOrder();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReturn = async () => {
    const activeItems = Object.values(selectedReturnItems)
      .filter(i => i.selected && i.quantity > 0)
      .map(i => ({ productId: i.productId, quantity: i.quantity, reason: returnReason }));

    if (activeItems.length === 0) {
      showError('Please select at least one item to return');
      return;
    }

    setSubmittingReturn(true);
    try {
      const res = await returnService.requestReturn(order.id, {
        reason: returnReason,
        customerDescription: returnDesc,
        items: activeItems
      });
      showSuccess(res.message || 'Return request submitted successfully');
      setIsReturnModalOpen(false);
      fetchOrder();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleSubmitReplacement = async () => {
    setSubmittingReplacement(true);
    try {
      const res = await replacementService.requestReplacement(order.id, {
        reason: replacementReason,
        description: replacementDesc
      });
      showSuccess(res.message || 'Replacement request submitted successfully');
      setIsReplacementModalOpen(false);
      fetchOrder();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit replacement request');
    } finally {
      setSubmittingReplacement(false);
    }
  };

  const handleCreatePayment = async () => {
    setRetrying(true);
    try {
      const res = await orderService.createPayment(order.id);
      const payload = res.data || res;
      setRetryPayload(payload);
      showSuccess('Payment portal ready! Proceeding to payment...');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to initialize payment gateway');
    } finally {
      setRetrying(false);
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

  // Eligibility rules
  const canCancel = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY'].includes(order.status);
  const isDelivered = order.status === 'DELIVERED';
  const canRetry = order.paymentStatus === 'PENDING' || order.status === 'PAYMENT_FAILED';

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Orders', to: '/orders' }, { label: `Order #${order.orderNumber}` }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Order #{order.orderNumber}</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Placed on: {new Date(order.createdAt || order.created_at).toLocaleString()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
          <Button
            variant="outline"
            size="sm"
            icon={Truck}
            onClick={() => navigate(`/orders/${order.id}/tracking`)}
          >
            Track Order 🚚
          </Button>
        </div>
      </div>

      {/* PHASE 21 STATUS BANNER */}
      {order.status === 'CONFIRMED' && (
        <Card padding="16px" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
          <div style={{ fontWeight: 800, color: '#D97706', fontSize: '1rem' }}>
            ⏳ Waiting for Store Confirmation
          </div>
          <p style={{ fontSize: '0.85rem', color: '#92400E', marginTop: '4px' }}>
            Your order has been placed successfully and is currently awaiting store admin approval. You will receive a notification once accepted.
          </p>
        </Card>
      )}

      {order.status === 'PENDING_PAYMENT' && (
        <Card padding="20px" style={{ background: '#EFF6FF', border: '1.5px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#1D4ED8', fontSize: '1.05rem' }}>
                💳 Order Accepted! Please Complete Payment
              </div>
              <p style={{ fontSize: '0.85rem', color: '#1E40AF', marginTop: '4px' }}>
                Store admin has accepted your order. Complete your payment to start order processing.
              </p>
            </div>
            <div>
              {retryPayload ? (
                <RazorpayCheckoutButton orderDetails={retryPayload} onSuccess={fetchOrder} />
              ) : (
                <Button variant="primary" size="md" loading={retrying} onClick={handleCreatePayment}>
                  💳 Pay Now ({formatCurrency(order.totalAmount)})
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {order.status === 'PROCESSING' && (
        <Card padding="16px" style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
          <div style={{ fontWeight: 800, color: '#047857', fontSize: '0.95rem' }}>
            {String(order.paymentMethod || '').toUpperCase() === 'COD'
              ? '📦 Order Accepted. Cash on Delivery.'
              : '✅ Payment Successful. Your order is being processed.'}
          </div>
        </Card>
      )}

      {order.status === 'REJECTED' && (
        <Card padding="16px" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <div style={{ fontWeight: 800, color: '#DC2626', fontSize: '1rem' }}>
            ❌ Order Rejected
          </div>
          {order.rejectionReason && (
            <p style={{ fontSize: '0.85rem', color: '#991B1B', marginTop: '4px' }}>
              Reason: {order.rejectionReason}
            </p>
          )}
        </Card>
      )}

      {/* VISUAL ORDER DELIVERY TIMELINE */}
      {order.status !== 'REJECTED' && order.status !== 'CANCELLED' && (
        <Card padding="20px">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="var(--color-primary)" /> Delivery Timeline & Tracking 🚚
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '16px', textAlign: 'center', fontSize: '0.75rem' }}>
            {[
              { id: 'CONFIRMED', label: 'Confirmed', icon: '✓' },
              { id: 'PROCESSING', label: 'Preparing', icon: '🧑‍🍳' },
              { id: 'READY_FOR_DELIVERY', label: 'Ready', icon: '📦' },
              { id: 'OUT_FOR_DELIVERY', label: 'On The Way', icon: '🚚' },
              { id: 'DELIVERED', label: 'Delivered', icon: '🎉' }
            ].map((step, idx) => {
              const statusOrder = ['CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
              const currentIdx = statusOrder.indexOf(order.status === 'PENDING_PAYMENT' ? 'CONFIRMED' : order.status);
              const stepIdx = statusOrder.indexOf(step.id);
              const isCompleted = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;

              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCompleted ? '#06C167' : '#E0E0E0',
                      color: '#FFF',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      border: isCurrent ? '3px solid #27AE60' : 'none'
                    }}
                  >
                    {isCompleted ? step.icon : idx + 1}
                  </div>
                  <span style={{ fontWeight: isCurrent ? 800 : 600, color: isCompleted ? '#2C3E50' : '#888' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
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
          {order.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06C167', fontWeight: 700 }}>
              <span>Coupon Discount ({order.couponCode || 'APPLIED'})</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          )}
          <div style={{ borderTop: '1.5px dashed var(--color-primary)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
            <span>Total Amount</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </Card>

      {/* Dynamic Action Buttons according to Eligibility */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="primary" icon={Truck} onClick={() => navigate(`/orders/${order.id}/tracking`)}>
          🚚 Track Order
        </Button>

        {canCancel && (
          <Button variant="danger" icon={XCircle} onClick={() => setIsCancelModalOpen(true)}>
            Cancel Order
          </Button>
        )}

        {isDelivered && (
          <>
            <Button variant="outline" icon={RotateCcw} onClick={() => setIsReturnModalOpen(true)}>
              Request Return
            </Button>
            <Button variant="secondary" icon={Repeat} onClick={() => setIsReplacementModalOpen(true)}>
              Request Replacement
            </Button>
          </>
        )}
      </div>

      {/* CANCELLATION MODAL */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Order">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: '#555' }}>
            Please provide a reason for cancelling Order #{order.orderNumber}.
          </p>
          <Input
            label="Cancellation Reason"
            placeholder="e.g. Ordered by mistake, Changed my mind"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Back</Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancelOrder}>Confirm Cancellation</Button>
          </div>
        </div>
      </Modal>

      {/* RETURN MODAL */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Request Return">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            ⚡ <strong>7-Day Return Policy</strong>: Select items and quantities you wish to return.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {order.items?.map((item) => {
              const key = item.id || item.product_id;
              const current = selectedReturnItems[key] || { selected: true, quantity: item.quantity };

              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', border: '1px solid #EEE', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={current.selected}
                      onChange={(e) => setSelectedReturnItems(prev => ({
                        ...prev,
                        [key]: { ...current, selected: e.target.checked, productId: item.product_id }
                      }))}
                    />
                    {item.product_name || item.name}
                  </label>
                  {current.selected && (
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={current.quantity}
                      onChange={(e) => setSelectedReturnItems(prev => ({
                        ...prev,
                        [key]: { ...current, quantity: Math.min(item.quantity, parseInt(e.target.value, 10) || 1) }
                      }))}
                      style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #CCC' }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Return Reason</label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
            >
              <option value="Defective / Damaged Item">Defective / Damaged Item</option>
              <option value="Wrong Item Delivered">Wrong Item Delivered</option>
              <option value="Quality Not Satisfactory">Quality Not Satisfactory</option>
              <option value="Expired Product">Expired Product</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <Input
            label="Additional Details (Optional)"
            placeholder="Describe the issue..."
            value={returnDesc}
            onChange={(e) => setReturnDesc(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={submittingReturn} onClick={handleSubmitReturn}>Submit Return Request</Button>
          </div>
        </div>
      </Modal>

      {/* REPLACEMENT MODAL */}
      <Modal isOpen={isReplacementModalOpen} onClose={() => setIsReplacementModalOpen(false)} title="Request Replacement">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Request a fresh replacement unit for damaged or incorrect items.
          </p>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Replacement Reason</label>
            <select
              value={replacementReason}
              onChange={(e) => setReplacementReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
            >
              <option value="Wrong Item / Quality Issue">Wrong Item / Quality Issue</option>
              <option value="Damaged Packaging / Leakage">Damaged Packaging / Leakage</option>
              <option value="Defective Item">Defective Item</option>
              <option value="Missing Items in Order">Missing Items in Order</option>
            </select>
          </div>

          <Input
            label="Replacement Description"
            placeholder="Explain why replacement is needed..."
            value={replacementDesc}
            onChange={(e) => setReplacementDesc(e.target.value)}
          />

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsReplacementModalOpen(false)}>Cancel</Button>
            <Button variant="secondary" loading={submittingReplacement} onClick={handleSubmitReplacement}>Submit Replacement Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
