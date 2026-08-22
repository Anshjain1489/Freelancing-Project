import React, { useEffect, useState } from 'react';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { returnService } from '../../services/return.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Truck, MapPin, Phone, CheckCircle, PackageCheck, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';

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
            Manage outbound deliveries and customer return pickups
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
            {orders.map(order => (
              <Card key={order.assignmentId} padding="20px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                      Order #{order.orderNumber}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', background: '#FFF3E0', color: '#E67E22' }}>
                    STATUS: {order.deliveryStatus}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#777', fontWeight: 800 }}>Customer Info</div>
                    <div style={{ fontWeight: 800 }}>{order.customerName} ({order.customerPhone})</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#777', fontWeight: 800 }}>Delivery Location</div>
                    <div style={{ fontSize: '0.85rem' }}>{order.address?.addressLine1}, {order.address?.city}</div>
                  </div>
                </div>

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
                    <div style={{ fontSize: '0.8rem', color: '#777', fontWeight: 800 }}>Customer Info</div>
                    <div style={{ fontWeight: 800 }}>{ret.orders?.users?.full_name || 'Customer'} ({ret.orders?.users?.phone || 'N/A'})</div>
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
