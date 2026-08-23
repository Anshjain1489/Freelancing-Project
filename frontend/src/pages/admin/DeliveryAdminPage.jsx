import React, { useEffect, useState } from 'react';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, UserPlus, MapPin, CheckCircle, Clock, AlertTriangle, ShieldCheck, Phone, Mail, Package, FileText, User, ChevronRight, X } from 'lucide-react';

export const DeliveryAdminPage = () => {
  const [dashboardSummary, setDashboardSummary] = useState({
    unassignedOrders: 0,
    assignedOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    failedDeliveries: 0
  });

  const [partners, setPartners] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [assignedDeliveries, setAssignedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab for Delivery Management Sections
  const [adminTab, setAdminTab] = useState('UNASSIGNED'); // 'UNASSIGNED' | 'ASSIGNED' | 'FLEET'

  // Modal State for Registering New Partner
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({ fullName: '', phone: '', email: '', password: '' });

  // Modal State for Assigning / Reassigning Partner
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Order Details Modal State
  const [viewDetailsOrder, setViewDetailsOrder] = useState(null);

  const fetchDeliveryData = async () => {
    setLoading(true);
    try {
      const [dashRes, partnersRes, unassignedRes, assignedRes] = await Promise.allSettled([
        deliveryPartnerService.getAdminDeliveryDashboard(),
        deliveryPartnerService.getDeliveryPartners(),
        deliveryPartnerService.getUnassignedOrders(),
        deliveryPartnerService.getAssignedDeliveries()
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardSummary(dashRes.value.data || {});
      }
      if (partnersRes.status === 'fulfilled') {
        setPartners(partnersRes.value.data?.items || []);
      }
      if (unassignedRes.status === 'fulfilled') {
        setUnassignedOrders(unassignedRes.value.data?.items || []);
      }
      if (assignedRes.status === 'fulfilled') {
        setAssignedDeliveries(assignedRes.value.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load delivery management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveryData();

    const handleRealtimeDelivery = () => {
      fetchDeliveryData();
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeDelivery);
    return () => window.removeEventListener('cks_delivery_updated', handleRealtimeDelivery);
  }, []);

  const [registering, setRegistering] = useState(false);

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      await deliveryPartnerService.createDeliveryPartner(registerForm);
      showSuccess('Delivery Partner account registered successfully! 🚚');
      setIsRegisterModalOpen(false);
      setRegisterForm({ fullName: '', phone: '', email: '', password: '' });
      fetchDeliveryData();
    } catch (err) {
      console.error('Registration failed:', err);
      showError(err.response?.data?.message || err.message || 'Failed to register delivery partner');
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenAssignModal = (order, reassignMode = false) => {
    setSelectedOrder(order);
    setIsReassigning(reassignMode);
    setSelectedPartnerId(partners[0]?.id || '');
    setEstimatedMinutes(30);
    setDeliveryNotes('');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedPartnerId) {
      showError('Please select a delivery partner');
      return;
    }

    setAssigning(true);
    try {
      if (isReassigning) {
        await deliveryPartnerService.reassignDeliveryPartner(selectedOrder.orderId, selectedPartnerId);
        showSuccess(`Order ${selectedOrder.orderNumber} reassigned to partner successfully!`);
      } else {
        await deliveryPartnerService.assignDeliveryPartner(selectedOrder.orderId, selectedPartnerId, estimatedMinutes, deliveryNotes);
        showSuccess(`Order ${selectedOrder.orderNumber} assigned to partner successfully!`);
      }
      setSelectedOrder(null);
      fetchDeliveryData();
    } catch (err) {
      if (err.response?.status === 409) {
        showError(err.response?.data?.message || 'Order delivery assignment modified by another admin.');
      } else {
        showError(err.response?.data?.message || 'Failed to assign delivery partner.');
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Delivery Management & Fleet Dispatch 🚚</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Assign delivery partners, inspect customer addresses, track real-time fleet workload, and manage dispatch lifecycle
          </p>
        </div>
        <Button variant="primary" size="md" icon={UserPlus} onClick={() => setIsRegisterModalOpen(true)}>
          Register Delivery Partner
        </Button>
      </div>

      {/* 1. 5 Delivery Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <Card padding="16px" style={{ borderLeft: '4px solid #E74C3C', background: '#FDEDEC' }}>
          <div style={{ fontSize: '0.75rem', color: '#78281F', textTransform: 'uppercase', fontWeight: 800 }}>🚚 Unassigned</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#C0392B', marginTop: '4px' }}>
            {dashboardSummary.unassignedOrders ?? unassignedOrders.length}
          </div>
        </Card>

        <Card padding="16px" style={{ borderLeft: '4px solid #F39C12', background: '#FEF9E7' }}>
          <div style={{ fontSize: '0.75rem', color: '#7E5109', textTransform: 'uppercase', fontWeight: 800 }}>📦 Assigned</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#D68910', marginTop: '4px' }}>
            {dashboardSummary.assignedOrders ?? assignedDeliveries.filter(a => ['ASSIGNED', 'ACCEPTED'].includes(a.deliveryStatus)).length}
          </div>
        </Card>

        <Card padding="16px" style={{ borderLeft: '4px solid #3498DB', background: '#EBF5FB' }}>
          <div style={{ fontSize: '0.75rem', color: '#1B4F72', textTransform: 'uppercase', fontWeight: 800 }}>🛵 Out For Delivery</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2980B9', marginTop: '4px' }}>
            {dashboardSummary.outForDelivery ?? assignedDeliveries.filter(a => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.deliveryStatus)).length}
          </div>
        </Card>

        <Card padding="16px" style={{ borderLeft: '4px solid #2ECC71', background: '#EAFAF1' }}>
          <div style={{ fontSize: '0.75rem', color: '#145A32', textTransform: 'uppercase', fontWeight: 800 }}>✅ Delivered Today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#27AE60', marginTop: '4px' }}>
            {dashboardSummary.deliveredToday ?? 0}
          </div>
        </Card>

        <Card padding="16px" style={{ borderLeft: '4px solid #8E44AD', background: '#F4ECF7' }}>
          <div style={{ fontSize: '0.75rem', color: '#4A235A', textTransform: 'uppercase', fontWeight: 800 }}>⚠️ Failed Deliveries</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8E44AD', marginTop: '4px' }}>
            {dashboardSummary.failedDeliveries ?? 0}
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        <Button
          variant={adminTab === 'UNASSIGNED' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setAdminTab('UNASSIGNED')}
        >
          Unassigned Orders ({unassignedOrders.length})
        </Button>

        <Button
          variant={adminTab === 'ASSIGNED' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setAdminTab('ASSIGNED')}
        >
          Assigned Deliveries ({assignedDeliveries.length})
        </Button>

        <Button
          variant={adminTab === 'FLEET' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setAdminTab('FLEET')}
        >
          Delivery Fleet Roster ({partners.length})
        </Button>
      </div>

      {/* 2. Unassigned Delivery Orders Section */}
      {adminTab === 'UNASSIGNED' && (
        <Card padding="20px">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--color-primary)" /> Orders Awaiting Delivery Partner Assignment ({unassignedOrders.length})
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map(i => <TableRowSkeleton key={i} />)}
            </div>
          ) : unassignedOrders.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              🟢 All orders are currently assigned to delivery partners!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {unassignedOrders.map(order => (
                <div
                  key={order.orderId}
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                        Order #{order.orderNumber}
                      </span>
                      <span style={{ marginLeft: '10px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, background: '#E8F7F0', color: '#06C167' }}>
                        {order.orderStatus}
                      </span>
                      <span style={{ marginLeft: '6px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, background: '#EBF5FB', color: '#2980B9' }}>
                        {order.paymentStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    {/* Customer Info */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Customer Contact</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={15} color="var(--color-primary)" /> {order.customer?.name || order.customerName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="#06C167" /> <strong>{order.customer?.phone || order.customerPhone || 'N/A'}</strong>
                      </div>
                      {order.customer?.email && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} /> {order.customer.email}
                        </div>
                      )}
                    </div>

                    {/* Delivery Address Breakdown */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Location</div>
                      <div style={{ fontSize: '0.85rem', color: '#2C3E50', lineHeight: '1.4' }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <MapPin size={15} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div>
                            {order.deliveryAddress?.houseNumber && <span>{order.deliveryAddress.houseNumber}, </span>}
                            {order.deliveryAddress?.street && <span>{order.deliveryAddress.street}, </span>}
                            {order.deliveryAddress?.landmark && <span style={{ color: '#E67E22' }}>Landmark: {order.deliveryAddress.landmark}, </span>}
                            {order.deliveryAddress?.city && <span>{order.deliveryAddress.city}, </span>}
                            {order.deliveryAddress?.state && <span>{order.deliveryAddress.state} - </span>}
                            <strong>{order.deliveryAddress?.pincode || order.address?.postal_code || order.address?.postalCode}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Order Items</div>
                      <div style={{ fontSize: '0.85rem', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={15} color="var(--color-primary)" /> {order.itemCount || order.items?.length || 0} Products
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <Button variant="outline" size="sm" onClick={() => setViewDetailsOrder(order)}>
                      View Order Details
                    </Button>
                    <Button variant="primary" size="sm" icon={Truck} onClick={() => handleOpenAssignModal(order, false)}>
                      Assign Delivery Partner
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 3. Assigned Deliveries Section */}
      {adminTab === 'ASSIGNED' && (
        <Card padding="20px">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="var(--color-primary)" /> Active & Assigned Deliveries ({assignedDeliveries.length})
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map(i => <TableRowSkeleton key={i} />)}
            </div>
          ) : assignedDeliveries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              No active delivery assignments found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {assignedDeliveries.map(asgn => (
                <div
                  key={asgn.assignmentId}
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#FFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                        Order #{asgn.orderNumber}
                      </span>
                      <span
                        style={{
                          marginLeft: '10px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: asgn.deliveryStatus === 'DELIVERED' ? '#E8F7F0' : asgn.deliveryStatus === 'FAILED_DELIVERY' ? '#FDEDEC' : '#FFF3E0',
                          color: asgn.deliveryStatus === 'DELIVERED' ? '#06C167' : asgn.deliveryStatus === 'FAILED_DELIVERY' ? '#C0392B' : '#E67E22'
                        }}
                      >
                        STATUS: {asgn.deliveryStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: 900 }}>
                      {formatCurrency(asgn.totalAmount)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {/* Customer */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Customer Contact</div>
                      <div style={{ fontWeight: 800 }}>{asgn.customer?.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2px' }}>📞 <strong>{asgn.customer?.phone}</strong></div>
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Address</div>
                      <div style={{ fontSize: '0.85rem', color: '#2C3E50' }}>
                        📍 {asgn.deliveryAddress?.fullAddressLine || 'Customer Address'}
                      </div>
                    </div>

                    {/* Assigned Partner */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Partner</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>🛵 {asgn.deliveryPartner?.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#333', marginTop: '2px' }}>📞 {asgn.deliveryPartner?.phone}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <Button variant="outline" size="sm" onClick={() => setViewDetailsOrder(asgn)}>
                      View Details
                    </Button>

                    {['ASSIGNED', 'ACCEPTED'].includes(asgn.deliveryStatus) && (
                      <Button variant="secondary" size="sm" onClick={() => handleOpenAssignModal(asgn, true)}>
                        Reassign Partner
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 4. Fleet Roster Section */}
      {adminTab === 'FLEET' && (
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
                    <th style={{ padding: '10px' }}>Completed Today</th>
                    <th style={{ padding: '10px' }}>Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 800 }}>{p.fullName || p.name}</td>
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
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>{p.completedTodayCount ?? 0} Today</td>
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
      )}

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
                <Button variant="primary" size="sm" type="submit" loading={registering}>Create Account</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ASSIGN / REASSIGN PARTNER MODAL */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '480px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 800 }}>
              {isReassigning ? `Reassign Partner for Order #${selectedOrder.orderNumber}` : `Assign Delivery Partner to Order #${selectedOrder.orderNumber}`}
            </h3>

            {/* Order & Customer Summary inside Modal */}
            <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>Customer: <strong>{selectedOrder.customer?.name || selectedOrder.customerName}</strong> ({selectedOrder.customer?.phone || selectedOrder.customerPhone})</div>
              <div>Address: 📍 {selectedOrder.deliveryAddress?.fullAddressLine || 'Customer Address'}</div>
              <div>Order Total: <strong>{formatCurrency(selectedOrder.totalAmount)}</strong> ({selectedOrder.itemCount || selectedOrder.items?.length || 0} items)</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                  Available Delivery Partners:
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {partners.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPartnerId(p.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: selectedPartnerId === p.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: selectedPartnerId === p.id ? 'var(--color-mint-light)' : '#FFF',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>👤 {p.fullName || p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#555' }}>📞 {p.phone}</div>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.75rem' }}>
                        <span style={{ background: '#E8F7F0', color: '#06C167', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          {p.activeDeliveriesCount || 0} Active
                        </span>
                        <div style={{ color: '#666', marginTop: '2px' }}>{p.completedTodayCount || 0} Today</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!isReassigning && (
                <>
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

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      Delivery Notes for Partner (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Handle fragile glass bottles with care"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                <Button variant="primary" size="sm" loading={assigning} onClick={handleConfirmAssignment}>
                  {isReassigning ? 'Confirm Reassignment' : 'Confirm Assignment'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewDetailsOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '520px', background: '#FFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Order #{viewDetailsOrder.orderNumber || viewDetailsOrder.orderId}</h3>
              <button onClick={() => setViewDetailsOrder(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
              {/* Customer */}
              <div>
                <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase' }}>Customer Contact</div>
                <div style={{ fontWeight: 800, marginTop: '2px' }}>👤 {viewDetailsOrder.customer?.name || viewDetailsOrder.customerName}</div>
                <div>📞 <strong>{viewDetailsOrder.customer?.phone || viewDetailsOrder.customerPhone}</strong></div>
                {viewDetailsOrder.customer?.email && <div>📧 {viewDetailsOrder.customer.email}</div>}
              </div>

              {/* Delivery Address */}
              <div>
                <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase' }}>Delivery Location</div>
                <div>📍 {viewDetailsOrder.deliveryAddress?.fullAddressLine || 'Address'}</div>
              </div>

              {/* Items */}
              {viewDetailsOrder.items && viewDetailsOrder.items.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Order Items ({viewDetailsOrder.items.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#F8F9FA', padding: '10px', borderRadius: '6px' }}>
                    {viewDetailsOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.name} x {item.quantity}</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem' }}>
                <span>Total Amount Paid</span>
                <span style={{ color: 'var(--color-primary-dark)' }}>{formatCurrency(viewDetailsOrder.totalAmount)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
