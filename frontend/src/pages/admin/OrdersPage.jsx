import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { orderService } from '../../services/order.service';
import { useNotifications } from '../../context/NotificationContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Select';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { ShoppingBag, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const [selectedTimelineOrder, setSelectedTimelineOrder] = useState(null);
  const [timelineHistory, setTimelineHistory] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const handleViewTimeline = async (order) => {
    setSelectedTimelineOrder(order);
    setLoadingTimeline(true);
    try {
      const res = await adminService.getOrders({ search: order.orderNumber });
      const fetched = res.data?.items?.[0];
      const trackingRes = await orderService.getOrderTracking(order.id);
      setTimelineHistory(trackingRes.data?.history || trackingRes.history || []);
    } catch (err) {
      console.error('Failed to load order history:', err);
      setTimelineHistory([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const { unresolvedOrders, fetchUnresolvedOrders } = useNotifications();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await adminService.getOrders({ search, status: statusFilter });
      setOrders(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter]);

  const handleAccept = async (orderId) => {
    setProcessingId(orderId);
    try {
      const res = await adminService.acceptOrder(orderId);
      const updatedStatus = res.data?.status || 'PROCESSING';
      showSuccess(updatedStatus === 'PENDING_PAYMENT' 
        ? 'Order accepted! Status updated to PENDING_PAYMENT (Waiting for customer payment).' 
        : 'Order accepted! Status updated to PROCESSING.');
      fetchOrders();
      fetchUnresolvedOrders();
    } catch (err) {
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Order accepted/processed by another administrator.');
      } else {
        showError(err.response?.data?.message || 'Failed to accept order.');
      }
      fetchOrders();
      fetchUnresolvedOrders();
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    setProcessingId(rejectingOrder.id);
    try {
      await adminService.rejectOrder(rejectingOrder.id, rejectionReason);
      showSuccess('Order rejected.');
      setRejectingOrder(null);
      setRejectionReason('');
      fetchOrders();
      fetchUnresolvedOrders();
    } catch (err) {
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Order already processed by another administrator.');
      } else {
        showError(err.response?.data?.message || 'Failed to reject order.');
      }
      fetchOrders();
      fetchUnresolvedOrders();
    } finally {
      setProcessingId(null);
    }
  };

  // Real-time SSE Order Status Listener
  useEffect(() => {
    const handleRealtimeStatus = (e) => {
      const data = e.detail;
      if (!data) return;
      const targetId = String(data.orderId || data.id || '');
      const newStatus = data.newStatus || data.status;
      if (!newStatus || !targetId) return;

      setOrders(prev => prev.map(o => {
        if (String(o.id) === targetId || String(o.orderNumber) === targetId) {
          return { ...o, status: newStatus };
        }
        return o;
       }));
    };

    window.addEventListener('cks_order_status_updated', handleRealtimeStatus);
    return () => window.removeEventListener('cks_order_status_updated', handleRealtimeStatus);
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    // Optimistic UI Update: Update React state immediately
    const prevOrders = [...orders];
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    try {
      await adminService.updateOrderStatus(orderId, newStatus);
      showSuccess(`Order status updated to ${newStatus}!`);
    } catch (err) {
      // Revert on error
      setOrders(prevOrders);
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Order status modified by another administrator.');
      } else {
        showError(err.response?.data?.message || 'Invalid status transition');
      }
    }
  };

  const handleRetryRefund = async (orderId) => {
    setProcessingId(orderId);
    try {
      const res = await adminService.retryRefund(orderId);
      showSuccess(res.message || 'Refund retry initiated!');
      fetchOrders();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to retry refund');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="text-h1">Store Orders 📋</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Process incoming customer orders, review decision requests, initiate automated Razorpay refunds, and trigger delivery status notifications
        </p>
      </div>

      {/* INCOMING UNRESOLVED ORDERS ALERT PANEL */}
      {unresolvedOrders.length > 0 && (
        <Card padding="20px" style={{ background: '#FFFDF5', border: '2px solid #FF6B00', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#FF6B00', color: '#FFF', padding: '8px', borderRadius: '50%', display: 'flex', animation: 'pulse 1.5s infinite' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2C3E50', margin: 0 }}>
                  🔔 INCOMING ORDERS ({unresolvedOrders.length} Awaiting Decision)
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#7F8C8D', margin: '2px 0 0' }}>
                  Action required: Accept or Reject customer orders to continue fulfillment
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {unresolvedOrders.map(ord => (
              <div
                key={ord.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8F7F0',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #E5E7EB', pb: '8px' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#06C167' }}>#{ord.orderNumber}</span>
                  <StatusBadge status={ord.paymentStatus || 'PAID'} />
                </div>

                <div style={{ fontSize: '0.85rem', color: '#333' }}>
                  <div style={{ fontWeight: 700 }}>Customer: {ord.customerName}</div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>Phone: {ord.customerPhone}</div>
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Items: <b>{ord.itemCount}</b></span>
                    <span style={{ fontWeight: 800, color: '#06C167' }}>{formatCurrency(ord.totalAmount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => setRejectingOrder(ord)}
                    disabled={processingId === ord.id}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #E74C3C',
                      background: '#FFF5F5',
                      color: '#C0392B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <XCircle size={15} /> ❌ Reject
                  </button>

                  <button
                    onClick={() => handleAccept(ord.id)}
                    disabled={processingId === ord.id}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: '#06C167',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      boxShadow: '0 2px 6px rgba(6,193,103,0.3)'
                    }}
                  >
                    <CheckCircle size={15} /> ✅ Accept Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ALL ORDERS TABLE */}
      <Card padding="20px">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by order number or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
            />
            <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          </div>

          <div style={{ width: '180px' }}>
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'CONFIRMED', label: 'Confirmed (Pending)' },
                { value: 'PENDING_PAYMENT', label: 'Pending Payment (Accepted)' },
                { value: 'PROCESSING', label: 'Processing (Accepted)' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'CANCELLED', label: 'Cancelled' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Order Number</th>
                  <th style={{ padding: '10px' }}>Customer</th>
                  <th style={{ padding: '10px' }}>Total Amount</th>
                  <th style={{ padding: '10px' }}>Payment / Refund</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions / Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800 }}>{order.orderNumber}</td>
                    <td style={{ padding: '12px 10px' }}>{order.customerName} ({order.customerPhone})</td>
                    <td style={{ padding: '12px 10px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{formatCurrency(order.totalAmount)}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <StatusBadge status={order.paymentStatus} />
                        {order.refundStatus && order.refundStatus !== 'NOT_REQUIRED' && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              width: 'fit-content',
                              background:
                                order.refundStatus === 'COMPLETED' ? '#E8F7F0' :
                                order.refundStatus === 'FAILED' ? '#FFF5F5' : '#FFFDF5',
                              color:
                                order.refundStatus === 'COMPLETED' ? '#06C167' :
                                order.refundStatus === 'FAILED' ? '#C0392B' : '#FF6B00',
                              border: `1px solid ${
                                order.refundStatus === 'COMPLETED' ? '#06C167' :
                                order.refundStatus === 'FAILED' ? '#E74C3C' : '#FF6B00'
                              }`
                            }}
                          >
                            Refund: {order.refundStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <StatusBadge status={order.status} />
                      {order.rejectionReason && (
                        <div style={{ fontSize: '0.75rem', color: '#E74C3C', marginTop: '2px' }}>
                          Reason: {order.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      {order.status === 'CONFIRMED' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setRejectingOrder(order)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#FFF5F5', color: '#C0392B', border: '1px solid #E74C3C', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Reject & Refund
                          </button>
                          <button
                            onClick={() => handleAccept(order.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Accept
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => handleViewTimeline(order)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#F1F5F9', color: '#1E293B', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            📜 Timeline
                          </button>
                          {order.status === 'REJECTED' && order.refundStatus === 'FAILED' && (
                            <button
                              onClick={() => handleRetryRefund(order.id)}
                              disabled={processingId === order.id}
                              style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#FF6B00', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                            >
                              🔄 Retry Refund
                            </button>
                          )}
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}
                          >
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                            <option value="DELIVERED">DELIVERED</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REJECT & REFUND CONFIRMATION MODAL */}
      {rejectingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '440px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#C0392B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={20} /> Reject Order #{rejectingOrder.orderNumber}
            </h3>

            <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
              <div><strong>Customer:</strong> {rejectingOrder.customerName}</div>
              <div><strong>Payment Method:</strong> {rejectingOrder.paymentStatus === 'PAID' ? 'PAID ONLINE (Razorpay)' : 'CASH ON DELIVERY (COD)'}</div>
              <div><strong>Verified Total Paid:</strong> <span style={{ fontWeight: 800, color: '#06C167' }}>{formatCurrency(rejectingOrder.totalAmount)}</span></div>
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #DDD', fontWeight: 800, color: '#C0392B' }}>
                Razorpay Refund Amount: {rejectingOrder.paymentStatus === 'PAID' ? formatCurrency(rejectingOrder.totalAmount) : '₹0.00 (COD - No Refund Needed)'}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
              State rejection reason for customer notification:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setRejectingOrder(null)}>Cancel</Button>
              <button
                onClick={handleConfirmReject}
                disabled={processingId === rejectingOrder.id}
                style={{ padding: '6px 14px', borderRadius: '6px', background: '#E74C3C', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {rejectingOrder.paymentStatus === 'PAID' ? `❌ Reject & Refund ${formatCurrency(rejectingOrder.totalAmount)}` : '❌ Reject Order'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ADMINISTRATIVE ORDER STATUS HISTORY TIMELINE MODAL */}
      {selectedTimelineOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', background: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1E293B', fontWeight: 800 }}>
                  📜 Audit History: Order #{selectedTimelineOrder.orderNumber}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Complete chronological status transitions & audit records
                </span>
              </div>
              <button
                onClick={() => setSelectedTimelineOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {loadingTimeline ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                Loading order history...
              </div>
            ) : timelineHistory.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                No tracking history recorded for this order.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {timelineHistory.map((h, i) => (
                  <div key={h.id || i} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #2563EB', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                      <span>
                        {h.previous_status ? `${h.previous_status} ➔ ` : ''}{h.new_status}
                      </span>
                      <span style={{ color: '#64748B', fontWeight: 500 }}>
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ color: '#334155', marginTop: '2px' }}>
                      <strong>Changed By:</strong> {h.changed_by_role} {h.changed_by ? `(${h.changed_by})` : ''}
                    </div>

                    {h.reason && (
                      <div style={{ color: '#475569', marginTop: '2px', fontStyle: 'italic' }}>
                        "{h.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedTimelineOrder(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
