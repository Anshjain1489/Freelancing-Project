import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
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
      await adminService.acceptOrder(orderId);
      showSuccess('Order accepted! Status updated to PROCESSING.');
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminService.updateOrderStatus(orderId, newStatus);
      showSuccess(`Order status updated to ${newStatus}!`);
      fetchOrders();
    } catch (err) {
      showError(err.response?.data?.message || 'Invalid status transition');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="text-h1">Store Orders 📋</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Process incoming customer orders, review decision requests, and trigger delivery status notifications
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
                  <th style={{ padding: '10px' }}>Payment</th>
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
                    <td style={{ padding: '12px 10px' }}><StatusBadge status={order.paymentStatus} /></td>
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
                            Reject
                          </button>
                          <button
                            onClick={() => handleAccept(order.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Accept
                          </button>
                        </div>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.8rem' }}
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="REJECTED">REJECTED</option>
                          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REJECTION REASON MODAL */}
      {rejectingOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '420px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', color: '#C0392B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={20} /> Reject Order #{rejectingOrder.orderNumber}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
              Please state the reason for rejecting this customer order (e.g. item out of stock, store closed):
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
                style={{ padding: '6px 14px', borderRadius: '6px', background: '#E74C3C', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Confirm Rejection
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
