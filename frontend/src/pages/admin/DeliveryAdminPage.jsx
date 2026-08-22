import React, { useEffect, useState } from 'react';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, UserPlus, MapPin, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export const DeliveryAdminPage = () => {
  const [partners, setPartners] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Registering New Partner
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({ fullName: '', phone: '', email: '', password: '' });

  // Modal State for Assigning Partner
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [assigning, setAssigning] = useState(false);

  const fetchDeliveryData = async () => {
    setLoading(true);
    try {
      const [partnersRes, unassignedRes] = await Promise.allSettled([
        deliveryPartnerService.getDeliveryPartners(),
        deliveryPartnerService.getUnassignedOrders()
      ]);

      if (partnersRes.status === 'fulfilled') {
        setPartners(partnersRes.value.data?.items || []);
      }
      if (unassignedRes.status === 'fulfilled') {
        setUnassignedOrders(unassignedRes.value.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load delivery management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryData();

    const handleRealtimeDelivery = (e) => {
      fetchDeliveryData();
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeDelivery);
    return () => window.removeEventListener('cks_delivery_updated', handleRealtimeDelivery);
  }, []);

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    try {
      await deliveryPartnerService.createDeliveryPartner(registerForm);
      showSuccess('Delivery Partner account registered successfully! 🚚');
      setIsRegisterModalOpen(false);
      setRegisterForm({ fullName: '', phone: '', email: '', password: '' });
      fetchDeliveryData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to register delivery partner');
    }
  };

  const handleOpenAssignModal = (order) => {
    setSelectedOrder(order);
    setSelectedPartnerId(partners[0]?.id || '');
    setEstimatedMinutes(30);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedPartnerId) {
      showError('Please select a delivery partner');
      return;
    }

    setAssigning(true);
    try {
      await deliveryPartnerService.assignDeliveryPartner(selectedOrder.orderId, selectedPartnerId, estimatedMinutes);
      showSuccess(`Order ${selectedOrder.orderNumber} assigned to partner successfully!`);
      setSelectedOrder(null);
      fetchDeliveryData();
    } catch (err) {
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Order delivery already assigned by another admin.');
      } else {
        showError(err.response?.data?.message || 'Failed to assign delivery partner.');
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Delivery Management 🚚</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Fleet management, order assignments, workload distribution, and real-time delivery tracking
          </p>
        </div>
        <Button variant="primary" size="md" icon={UserPlus} onClick={() => setIsRegisterModalOpen(true)}>
          Register Delivery Partner
        </Button>
      </div>

      {/* Fleet Partners Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Total Fleet Partners</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginTop: '4px' }}>{partners.length}</div>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Active Fleet Workload</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#06C167', marginTop: '4px' }}>
            {partners.reduce((acc, p) => acc + (p.activeDeliveriesCount || 0), 0)} Deliveries
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Unassigned Orders</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: unassignedOrders.length > 0 ? '#E74C3C' : '#06C167', marginTop: '4px' }}>
            {unassignedOrders.length} Orders
          </div>
        </Card>
      </div>

      {/* 1. Orders Ready for Delivery Partner Assignment */}
      <Card padding="20px">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} color="var(--color-primary)" /> Orders Awaiting Delivery Partner Assignment ({unassignedOrders.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : unassignedOrders.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            🟢 All orders are currently assigned to delivery partners!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {unassignedOrders.map(order => (
              <div
                key={order.orderId}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-primary-dark)' }}>
                    Order #{order.orderNumber} • <span style={{ color: '#06C167' }}>{order.orderStatus}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                    Customer: <strong>{order.customerName}</strong> ({order.customerPhone})
                  </div>
                  {order.address && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {order.address.addressLine1}, {order.address.city} ({order.address.postalCode})
                    </div>
                  )}
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: '4px', color: '#2C3E50' }}>
                    Total: {formatCurrency(order.totalAmount)}
                  </div>
                </div>

                <Button variant="primary" size="sm" icon={Truck} onClick={() => handleOpenAssignModal(order)}>
                  Assign Delivery Partner
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Registered Delivery Partners List */}
      <Card padding="20px">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={18} color="var(--color-primary)" /> Delivery Fleet Roster & Active Workload ({partners.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Partner Name</th>
                  <th style={{ padding: '10px' }}>Contact Phone</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Active Deliveries</th>
                  <th style={{ padding: '10px' }}>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800 }}>{p.fullName}</td>
                    <td style={{ padding: '12px 10px', color: '#333' }}>{p.phone}</td>
                    <td style={{ padding: '12px 10px', color: '#666' }}>{p.email}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          background: p.activeDeliveriesCount > 0 ? '#E8F7F0' : '#F5F5F5',
                          color: p.activeDeliveriesCount > 0 ? '#06C167' : '#666'
                        }}
                      >
                        {p.activeDeliveriesCount} Active
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ color: p.isActive ? '#06C167' : '#E74C3C', fontWeight: 800 }}>
                        {p.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REGISTER PARTNER MODAL */}
      {isRegisterModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '420px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800 }}>Register Delivery Partner 🚚</h3>
            <form onSubmit={handleRegisterPartner} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, fullName: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Email (Optional)</label>
                <input
                  type="email"
                  placeholder="rahul.delivery@chaudhary.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Set login password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setIsRegisterModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Create Account</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ASSIGN PARTNER MODAL */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '440px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800 }}>
              Assign Partner to Order #{selectedOrder.orderNumber}
            </h3>

            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '16px' }}>
              Customer: <strong>{selectedOrder.customerName}</strong> ({selectedOrder.customerPhone})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Select Delivery Partner:
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 700 }}
                >
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      🟢 {p.fullName} ({p.phone}) — {p.activeDeliveriesCount} Active Deliveries
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Estimated Delivery Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="180"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                <Button variant="primary" size="sm" loading={assigning} onClick={handleConfirmAssignment}>Confirm Assignment</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
