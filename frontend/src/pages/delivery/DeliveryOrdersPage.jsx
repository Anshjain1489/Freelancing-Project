import React, { useEffect, useState } from 'react';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, MapPin, Phone, CheckCircle, PackageCheck, AlertTriangle, XCircle, Clock } from 'lucide-react';

export const DeliveryOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Failure Modal State
  const [failedOrder, setFailedOrder] = useState(null);
  const [failureReason, setFailureReason] = useState('Customer unavailable');
  const [submittingFailure, setSubmittingFailure] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await deliveryPartnerService.getAssignedOrders();
      setOrders(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load assigned delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleRealtimeDelivery = () => {
      fetchOrders();
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeDelivery);
    return () => window.removeEventListener('cks_delivery_updated', handleRealtimeDelivery);
  }, []);

  // Action Handlers with Optimistic Updates
  const handleAccept = async (orderId) => {
    const prev = [...orders];
    setOrders(list => list.map(o => o.orderId === orderId ? { ...o, deliveryStatus: 'ACCEPTED' } : o));

    try {
      await deliveryPartnerService.acceptDelivery(orderId);
      showSuccess('Delivery assignment accepted! 🚚');
    } catch (err) {
      setOrders(prev);
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Assignment modified by another user.');
      } else {
        showError(err.response?.data?.message || 'Failed to accept delivery.');
      }
    }
  };

  const handlePickup = async (orderId) => {
    const prev = [...orders];
    setOrders(list => list.map(o => o.orderId === orderId ? { ...o, deliveryStatus: 'PICKED_UP', orderStatus: 'OUT_FOR_DELIVERY' } : o));

    try {
      await deliveryPartnerService.pickupDelivery(orderId);
      showSuccess('Order marked as Picked Up! Status changed to Out For Delivery.');
    } catch (err) {
      setOrders(prev);
      showError(err.response?.data?.message || 'Failed to mark picked up.');
    }
  };

  const handleDeliver = async (orderId) => {
    const prev = [...orders];
    setOrders(list => list.map(o => o.orderId === orderId ? { ...o, deliveryStatus: 'DELIVERED', orderStatus: 'DELIVERED' } : o));

    try {
      await deliveryPartnerService.deliverOrder(orderId);
      showSuccess('Order marked DELIVERED successfully! 🎉');
    } catch (err) {
      setOrders(prev);
      showError(err.response?.data?.message || 'Failed to mark delivered.');
    }
  };

  const handleConfirmFailed = async () => {
    if (!failedOrder || !failureReason) {
      showError('Please select or specify a failure reason');
      return;
    }

    setSubmittingFailure(true);
    try {
      await deliveryPartnerService.failDelivery(failedOrder.orderId, failureReason);
      showSuccess('Delivery failure recorded. Admin notified.');
      setFailedOrder(null);
      fetchOrders();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit failure status.');
    } finally {
      setSubmittingFailure(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">My Assigned Deliveries 📦</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            View your active order assignments, navigate delivery addresses, and update delivery status
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => <TableRowSkeleton key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center' }}>
          <Truck size={40} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>No Assigned Deliveries</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            You currently have no pending or active delivery assignments. New orders assigned by Admin will appear here in real-time.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <Card key={order.assignmentId} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                    Order #{order.orderNumber}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                    Assigned At: {new Date(order.assignedAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      background: order.deliveryStatus === 'DELIVERED' ? '#E8F7F0' : order.deliveryStatus === 'FAILED_DELIVERY' ? '#FFF5F5' : '#FFF3E0',
                      color: order.deliveryStatus === 'DELIVERED' ? '#06C167' : order.deliveryStatus === 'FAILED_DELIVERY' ? '#C0392B' : '#E67E22',
                      border: `1px solid ${order.deliveryStatus === 'DELIVERED' ? '#06C167' : order.deliveryStatus === 'FAILED_DELIVERY' ? '#E74C3C' : '#F39C12'}`
                    }}
                  >
                    DELIVERY STATUS: {order.deliveryStatus}
                  </span>
                </div>
              </div>

              {/* Customer & Address Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Customer Info</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '2px' }}>{order.customerName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#06C167', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={14} /> <a href={`tel:${order.customerPhone}`} style={{ textDecoration: 'none', color: 'inherit' }}>{order.customerPhone}</a>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Delivery Location</div>
                  {order.address ? (
                    <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2px' }}>
                      {order.address.addressLine1}, {order.address.addressLine2 && `${order.address.addressLine2}, `}
                      {order.address.city} - {order.address.postalCode}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#888' }}>Address details unavailable</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Order Amount & Items</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#2C3E50', marginTop: '2px' }}>
                    {formatCurrency(order.totalAmount)} • <span style={{ fontSize: '0.8rem', color: '#666' }}>({order.itemCount} Items)</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: order.paymentStatus === 'PAID' ? '#06C167' : '#E67E22', marginTop: '2px' }}>
                    Payment: {order.paymentStatus} ({order.paymentMethod || 'RAZORPAY'})
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ background: '#F9F9F9', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 800, marginBottom: '4px', color: '#555' }}>Items to Deliver:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {order.items.map((item, idx) => (
                    <span key={idx} style={{ background: '#FFF', border: '1px solid #DDD', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {item.name} x {item.quantity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Failure Warning if any */}
              {order.deliveryStatus === 'FAILED_DELIVERY' && (
                <div style={{ background: '#FFF5F5', border: '1px solid #E74C3C', borderRadius: '6px', padding: '10px 12px', marginBottom: '16px', fontSize: '0.85rem', color: '#C0392B', fontWeight: 700 }}>
                  ⚠️ Delivery Attempt Failed: {order.failureReason || 'Reason unspecified'}
                </div>
              )}

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                {order.deliveryStatus === 'ASSIGNED' && (
                  <Button variant="primary" size="sm" onClick={() => handleAccept(order.orderId)}>
                    Accept Delivery Assignment
                  </Button>
                )}

                {['ASSIGNED', 'ACCEPTED'].includes(order.deliveryStatus) && (
                  <Button variant="secondary" size="sm" icon={PackageCheck} onClick={() => handlePickup(order.orderId)}>
                    Mark Picked Up (Out For Delivery)
                  </Button>
                )}

                {['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.deliveryStatus) && (
                  <>
                    <Button variant="primary" size="sm" icon={CheckCircle} onClick={() => handleDeliver(order.orderId)}>
                      Mark Delivered 🎉
                    </Button>

                    <Button variant="danger" size="sm" icon={XCircle} onClick={() => setFailedOrder(order)}>
                      Delivery Failed ⚠️
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* FAILURE REASON MODAL */}
      {failedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '420px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#C0392B' }}>
              Mark Delivery Failed: Order #{failedOrder.orderNumber}
            </h3>

            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '16px' }}>
              Please select or enter the mandatory reason why delivery could not be completed:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 700 }}
              >
                <option value="Customer unavailable">Customer unavailable / Door locked</option>
                <option value="Wrong delivery address">Wrong delivery address / Unable to locate</option>
                <option value="Customer refused order">Customer refused order</option>
                <option value="Phone unreachable">Phone number unreachable</option>
                <option value="Other delivery issue">Other delivery issue</option>
              </select>

              {failureReason === 'Other delivery issue' && (
                <textarea
                  rows="3"
                  placeholder="Specify failure details..."
                  onChange={(e) => setFailureReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <Button variant="outline" size="sm" onClick={() => setFailedOrder(null)}>Cancel</Button>
                <Button variant="danger" size="sm" loading={submittingFailure} onClick={handleConfirmFailed}>Submit Failure Status</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
