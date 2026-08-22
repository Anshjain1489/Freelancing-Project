import React, { useEffect, useState } from 'react';
import { returnService } from '../../services/return.service';
import { deliveryService } from '../../services/delivery.management.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { CheckCircle, XCircle, Truck, PackageCheck, RefreshCw } from 'lucide-react';

export const AdminReturnsPage = () => {
  const [returnsList, setReturnsList] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [itemsCondition, setItemsCondition] = useState([]);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [retData, partnerData] = await Promise.all([
        returnService.getAdminReturns(),
        deliveryService.getDeliveryPartners()
      ]);
      setReturnsList(Array.isArray(retData) ? retData : []);
      setPartners(Array.isArray(partnerData?.items) ? partnerData.items : (Array.isArray(partnerData) ? partnerData : []));
    } catch (err) {
      console.error('Failed to load returns admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    setProcessing(true);
    try {
      const res = await returnService.approveReturn(id);
      showSuccess(res.message || 'Return approved successfully');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve return');
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignPickup = async () => {
    if (!selectedPartnerId) {
      showError('Please select a delivery partner for pickup');
      return;
    }
    setProcessing(true);
    try {
      const res = await returnService.assignPickup(selectedReturn.id, selectedPartnerId);
      showSuccess(res.message || 'Reverse pickup partner assigned');
      setIsPickupModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to assign pickup partner');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReceived = async () => {
    setProcessing(true);
    try {
      const res = await returnService.confirmReceived(selectedReturn.id, itemsCondition);
      showSuccess(res.message || 'Return confirmed as received! Inventory & Refund updated.');
      setIsReceiveModalOpen(false);
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to confirm return received');
    } finally {
      setProcessing(false);
    }
  };

  const openReceiveModal = (ret) => {
    setSelectedReturn(ret);
    const initialCond = (ret.return_items || []).map(i => ({
      productId: i.product_id,
      receivedQuantity: i.quantity,
      conditionStatus: 'RESTOCKABLE'
    }));
    setItemsCondition(initialCond);
    setIsReceiveModalOpen(true);
  };

  const filtered = statusFilter === 'ALL'
    ? returnsList
    : returnsList.filter(r => r.status === statusFilter);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="text-h1">Return & Reverse Pickup Management</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Approve returns, assign reverse pickup partners, and verify received inventory.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['ALL', 'REQUESTED', 'APPROVED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'REFUNDED'].map(st => (
          <Button
            key={st}
            variant={statusFilter === st ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Skeleton height="150px" borderRadius="12px" />
      ) : filtered.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#777' }}>
          No return requests found.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(item => (
            <Card key={item.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Return #{item.return_number || item.id}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Order #{item.orders?.order_number || item.order_id} • Customer: {item.orders?.users?.full_name || 'Customer'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <StatusBadge status={item.status} />
                  <StatusBadge status={item.refund_status} />
                </div>
              </div>

              <div style={{ marginTop: '12px', background: '#FAF9FE', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>Reason:</strong> {item.reason}<br />
                {item.customer_description && <div><strong>Description:</strong> {item.customer_description}</div>}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
                {item.status === 'REQUESTED' && (
                  <Button variant="primary" size="sm" icon={CheckCircle} loading={processing} onClick={() => handleApprove(item.id)}>
                    Approve Return
                  </Button>
                )}

                {item.status === 'APPROVED' && (
                  <Button variant="secondary" size="sm" icon={Truck} onClick={() => { setSelectedReturn(item); setIsPickupModalOpen(true); }}>
                    Assign Reverse Pickup Partner
                  </Button>
                )}

                {['PICKUP_ASSIGNED', 'PICKED_UP', 'APPROVED'].includes(item.status) && (
                  <Button variant="success" size="sm" icon={PackageCheck} onClick={() => openReceiveModal(item)}>
                    Confirm Return Received
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ASSIGN PICKUP MODAL */}
      <Modal isOpen={isPickupModalOpen} onClose={() => setIsPickupModalOpen(false)} title="Assign Reverse Pickup Partner">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            Select a Delivery Partner to pick up Return #{selectedReturn?.return_number}.
          </p>
          <select
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CCC' }}
          >
            <option value="">Select Delivery Partner...</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.name || p.email} ({p.phone || 'Fleet'})</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsPickupModalOpen(false)}>Cancel</Button>
            <Button variant="secondary" loading={processing} onClick={handleAssignPickup}>Assign Pickup</Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM RETURN RECEIVED MODAL */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Confirm Return Received & Inventory Rules">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            Verify returned items condition before updating sellable stock & processing refund.
          </p>

          {itemsCondition.map((cond, idx) => (
            <div key={idx} style={{ padding: '12px', border: '1px solid #EEE', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Product ID: {cond.productId}</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem' }}>Condition:</label>
                <select
                  value={cond.conditionStatus}
                  onChange={(e) => {
                    const newConds = [...itemsCondition];
                    newConds[idx].conditionStatus = e.target.value;
                    setItemsCondition(newConds);
                  }}
                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #CCC' }}
                >
                  <option value="RESTOCKABLE">RESTOCKABLE (Increments stock_quantity)</option>
                  <option value="DAMAGED">DAMAGED (Audit Log only; No stock increment)</option>
                </select>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={processing} onClick={handleConfirmReceived}>Confirm Received & Restock</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
