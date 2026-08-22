import React, { useEffect, useState } from 'react';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { returnService } from '../../services/return.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, MapPin, Phone, CheckCircle, PackageCheck, AlertTriangle, XCircle, RotateCcw, ExternalLink, Mail, User, Clock, ChevronRight, X } from 'lucide-react';

export const DeliveryOrdersPage = () => {
  const [activeTab, setActiveTab] = useState('DELIVERIES'); // 'DELIVERIES' | 'RETURN_PICKUPS'
  const [orders, setOrders] = useState([]);
  const [returnPickups, setReturnPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Failure Modal State
  const [failedOrder, setFailedOrder] = useState(null);
  const [failedPickup, setFailedPickup] = useState(null);
  const [failureReason, setFailureReason] = useState('Customer unavailable');
  const [submittingFailure, setSubmittingFailure] = useState(false);

  // Detailed Order View Modal
  const [detailOrder, setDetailOrder] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resOrders, resPickups] = await Promise.all([
        deliveryPartnerService.getAssignedOrders(),
        returnService.getReturnPickups()
      ]);
      setOrders(resOrders.data?.items || []);
      setReturnPickups(Array.isArray(resPickups) ? resPickups : (resPickups?.items || []));
    } catch (err) {
      console.error('Failed to load delivery/pickup orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const handleRealtimeDelivery = () => {
      fetchAllData();
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeDelivery);
    window.addEventListener('cks_return_pickup_updated', handleRealtimeDelivery);
    return () => {
      window.removeEventListener('cks_delivery_updated', handleRealtimeDelivery);
      window.removeEventListener('cks_return_pickup_updated', handleRealtimeDelivery);
    };
  }, []);

  // Outbound Delivery Handlers
  const handleAccept = async (orderId) => {
    try {
      await deliveryPartnerService.acceptDelivery(orderId);
      showSuccess('Delivery assignment accepted! 🚚');
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept delivery.');
    }
  };

  const handlePickup = async (orderId) => {
    try {
      await deliveryPartnerService.pickupDelivery(orderId);
      showSuccess('Order marked as Picked Up! Status changed to Out For Delivery.');
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to mark picked up.');
    }
  };

  const handleDeliver = async (orderId) => {
    try {
      await deliveryPartnerService.deliverOrder(orderId);
      showSuccess('Order marked DELIVERED successfully! 🎉');
      fetchAllData();
    } catch (err) {
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
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit failure status.');
    } finally {
      setSubmittingFailure(false);
    }
  };

  // Reverse Pickup Handlers
  const handleAcceptPickup = async (pickupId) => {
    try {
      await returnService.acceptPickup(pickupId);
      showSuccess('Return pickup assignment accepted!');
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept return pickup.');
    }
  };

  const handleMarkPickedUp = async (pickupId) => {
    try {
      await returnService.markPickedUp(pickupId);
      showSuccess('Return item marked as PICKED UP! 📦');
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to mark return picked up.');
    }
  };

  const handleConfirmPickupFailed = async () => {
    if (!failedPickup || !failureReason) {
      showError('Failure reason is mandatory');
      return;
    }
    setSubmittingFailure(true);
    try {
      await returnService.failPickup(failedPickup.id, failureReason);
      showSuccess('Return pickup failure recorded.');
      setFailedPickup(null);
      fetchAllData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to record pickup failure.');
    } finally {
      setSubmittingFailure(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Delivery & Reverse Pickup Fleet 🚚</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Manage outbound customer deliveries, contact customer, navigate address, and process return pickups
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant={activeTab === 'DELIVERIES' ? 'primary' : 'outline'}
            size="sm"
            icon={Truck}
            onClick={() => setActiveTab('DELIVERIES')}
          >
            Outbound Deliveries ({orders.length})
          </Button>
          <Button
            variant={activeTab === 'RETURN_PICKUPS' ? 'primary' : 'outline'}
            size="sm"
            icon={RotateCcw}
            onClick={() => setActiveTab('RETURN_PICKUPS')}
          >
            Return Pickups ({returnPickups.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map(i => <TableRowSkeleton key={i} />)}
        </div>
      ) : activeTab === 'DELIVERIES' ? (
        // OUTBOUND DELIVERIES
        orders.length === 0 ? (
          <Card padding="32px" style={{ textAlign: 'center' }}>
            <Truck size={40} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>No Assigned Deliveries</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              You currently have no pending outbound delivery assignments.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map(order => {
              const customerPhone = order.customer?.phone || order.customerPhone || '';
              const callLink = order.callUrl || (customerPhone ? `tel:+91${customerPhone.replace(/^0+/, '')}` : null);

              const fullAddressStr = order.deliveryAddress?.fullAddressLine || 
                [order.address?.address_line1, order.address?.address_line2, order.address?.city, order.address?.postal_code || order.address?.postalCode].filter(Boolean).join(', ');
              
              const mapsLink = order.googleMapsUrl || (fullAddressStr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressStr)}` : null);

              return (
                <Card key={order.assignmentId} padding="20px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                        Order #{order.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                        Payment: <strong>{order.paymentStatus || 'PAID'}</strong> ({order.paymentMethod || 'RAZORPAY'})
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        background: order.deliveryStatus === 'DELIVERED' ? '#E8F7F0' : order.deliveryStatus === 'FAILED_DELIVERY' ? '#FDEDEC' : '#FFF3E0',
                        color: order.deliveryStatus === 'DELIVERED' ? '#06C167' : order.deliveryStatus === 'FAILED_DELIVERY' ? '#C0392B' : '#E67E22'
                      }}
                    >
                      DELIVERY STATUS: {order.deliveryStatus}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    {/* Customer Info */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Customer Contact</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={15} color="var(--color-primary)" /> {order.customer?.name || order.customerName}
                      </div>

                      {customerPhone && (
                        <div style={{ marginTop: '6px' }}>
                          <a
                            href={callLink}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#06C167',
                              color: '#FFF',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              textDecoration: 'none'
                            }}
                          >
                            <Phone size={14} /> Call Customer ({customerPhone})
                          </a>
                        </div>
                      )}

                      {(order.customer?.email || order.customerEmail) && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={13} /> {order.customer?.email || order.customerEmail}
                        </div>
                      )}
                    </div>

                    {/* Delivery Location Breakdown */}
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>Delivery Address</div>
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

                      {mapsLink && (
                        <div style={{ marginTop: '8px' }}>
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#2980B9',
                              color: '#FFF',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              textDecoration: 'none'
                            }}
                          >
                            <ExternalLink size={14} /> Open in Google Maps 🗺️
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <Button variant="outline" size="sm" onClick={() => setDetailOrder(order)}>
                      View Full Details
                    </Button>

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
              );
            })}
          </div>
        )
      ) : (
        // REVERSE PICKUPS TAB
        returnPickups.length === 0 ? (
          <Card padding="32px" style={{ textAlign: 'center' }}>
            <RotateCcw size={40} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>No Return Pickups</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              You currently have no return pickups assigned.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {returnPickups.map(ret => (
              <Card key={ret.id} padding="20px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#D35400' }}>
                      Return #{ret.return_number || ret.id}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '2px' }}>
                      Order #{ret.orders?.order_number || ret.order_id}
                    </div>
                  </div>

                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', background: '#FFF0E6', color: '#D35400' }}>
                    PICKUP STATUS: {ret.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#777', fontWeight: 800 }}>Customer Contact</div>
                    <div style={{ fontWeight: 800 }}>{ret.orders?.users?.full_name || 'Customer'}</div>
                    {ret.orders?.users?.phone && (
                      <div style={{ marginTop: '4px' }}>
                        <a href={`tel:+91${ret.orders.users.phone.replace(/^0+/, '')}`} style={{ color: '#06C167', fontWeight: 800, textDecoration: 'none', fontSize: '0.85rem' }}>
                          📞 Call Customer ({ret.orders.users.phone})
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#777', fontWeight: 800 }}>Pickup Reason</div>
                    <div style={{ fontSize: '0.85rem', color: '#D35400', fontWeight: 700 }}>{ret.reason}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                  {ret.status === 'PICKUP_ASSIGNED' && (
                    <Button variant="primary" size="sm" onClick={() => handleAcceptPickup(ret.id)}>
                      Accept Pickup Assignment
                    </Button>
                  )}

                  {['PICKUP_ASSIGNED', 'ACCEPTED'].includes(ret.status) && (
                    <>
                      <Button variant="success" size="sm" icon={PackageCheck} onClick={() => handleMarkPickedUp(ret.id)}>
                        Mark Return Picked Up 📦
                      </Button>
                      <Button variant="danger" size="sm" icon={XCircle} onClick={() => setFailedPickup(ret)}>
                        Pickup Failed ⚠️
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* FULL ORDER DETAILS MODAL */}
      {detailOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '520px', background: '#FFF', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Order #{detailOrder.orderNumber} Details</h3>
              <button onClick={() => setDetailOrder(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
              {/* Customer */}
              <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>CUSTOMER INFORMATION</div>
                <div style={{ fontWeight: 800 }}>👤 {detailOrder.customer?.name || detailOrder.customerName}</div>
                <div>📞 <strong>{detailOrder.customer?.phone || detailOrder.customerPhone}</strong></div>
                {(detailOrder.customer?.email || detailOrder.customerEmail) && <div>📧 {detailOrder.customer?.email || detailOrder.customerEmail}</div>}
              </div>

              {/* Delivery Address */}
              <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>DELIVERY ADDRESS</div>
                <div>📍 {detailOrder.deliveryAddress?.fullAddressLine || 'Customer Address'}</div>
              </div>

              {/* Items */}
              {detailOrder.items && detailOrder.items.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#777', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>ORDER ITEMS ({detailOrder.items.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {detailOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #EEE', paddingBottom: '4px' }}>
                        <span>{item.name} x {item.quantity}</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery Status Timeline */}
              <div style={{ background: '#FAF9FE', border: '1px solid #E2D9F3', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#5A32A3', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>DELIVERY TIMELINE STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                  <div>✓ Assigned: {detailOrder.assignedAt ? new Date(detailOrder.assignedAt).toLocaleString() : 'Pending'}</div>
                  <div>{['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(detailOrder.deliveryStatus) ? '✓' : '○'} Accepted: {detailOrder.acceptedAt ? new Date(detailOrder.acceptedAt).toLocaleString() : 'Pending'}</div>
                  <div>{['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(detailOrder.deliveryStatus) ? '✓' : '○'} Picked Up: {detailOrder.pickedUpAt ? new Date(detailOrder.pickedUpAt).toLocaleString() : 'Pending'}</div>
                  <div>{detailOrder.deliveryStatus === 'DELIVERED' ? '✓' : '○'} Delivered: {detailOrder.deliveredAt ? new Date(detailOrder.deliveredAt).toLocaleString() : 'Pending'}</div>
                </div>
              </div>

              {/* Total Payable */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem' }}>
                <span>Order Total</span>
                <span style={{ color: 'var(--color-primary-dark)' }}>{formatCurrency(detailOrder.totalAmount)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* FAILURE REASON MODALS */}
      {failedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '420px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#C0392B' }}>
              Mark Delivery Failed: Order #{failedOrder.orderNumber}
            </h3>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 700, marginBottom: '16px' }}
            >
              <option value="Customer unavailable">Customer unavailable / Door locked</option>
              <option value="Wrong delivery address">Wrong delivery address / Unable to locate</option>
              <option value="Customer refused order">Customer refused order</option>
              <option value="Phone unreachable">Phone number unreachable</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setFailedOrder(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={submittingFailure} onClick={handleConfirmFailed}>Submit Failure</Button>
            </div>
          </Card>
        </div>
      )}

      {failedPickup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '420px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#C0392B' }}>
              Mark Return Pickup Failed: #{failedPickup.return_number || failedPickup.id}
            </h3>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 700, marginBottom: '16px' }}
            >
              <option value="Customer unavailable for pickup">Customer unavailable for pickup</option>
              <option value="Item not ready for return">Item not ready for return</option>
              <option value="Address mismatch">Address mismatch</option>
              <option value="Customer cancelled return">Customer cancelled return</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setFailedPickup(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={submittingFailure} onClick={handleConfirmPickupFailed}>Submit Pickup Failure</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
