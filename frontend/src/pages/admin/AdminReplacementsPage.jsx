import React, { useEffect, useState } from 'react';
import { replacementService } from '../../services/replacement.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { CheckCircle, XCircle, Repeat, Truck } from 'lucide-react';

export const AdminReplacementsPage = () => {
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const data = await replacementService.getAdminReplacements();
      setReplacements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load replacement admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplacements();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await replacementService.approveReplacement(id);
      showSuccess(res.message || 'Replacement approved & stock reserved');
      fetchReplacements();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve replacement (Check stock)');
    }
  };

  const handleUpdateFulfillment = async (id, status) => {
    try {
      const res = await replacementService.updateFulfillment(id, status);
      showSuccess(res.message || `Replacement status updated to ${status}`);
      fetchReplacements();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update fulfillment status');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="text-h1">Replacement Request Management</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Approve customer replacement requests with atomic stock reservation.
        </p>
      </div>

      {loading ? (
        <Skeleton height="150px" borderRadius="12px" />
      ) : replacements.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#777' }}>
          No replacement requests found.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {replacements.map(item => (
            <Card key={item.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    Order #{item.orders?.order_number || item.order_id}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Customer: {item.orders?.users?.full_name || 'Customer'} • {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div style={{ marginTop: '12px', background: '#FAF9FE', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                <strong>Reason:</strong> {item.reason}<br />
                {item.description && <div><strong>Description:</strong> {item.description}</div>}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
                {item.status === 'REQUESTED' && (
                  <Button variant="primary" size="sm" icon={CheckCircle} onClick={() => handleApprove(item.id)}>
                    Approve & Reserve Stock
                  </Button>
                )}

                {item.status === 'APPROVED' && (
                  <Button variant="secondary" size="sm" icon={Truck} onClick={() => handleUpdateFulfillment(item.id, 'OUT_FOR_DELIVERY')}>
                    Mark Out For Delivery
                  </Button>
                )}

                {item.status === 'OUT_FOR_DELIVERY' && (
                  <Button variant="success" size="sm" onClick={() => handleUpdateFulfillment(item.id, 'DELIVERED')}>
                    Mark Delivered (Consume Replacement Stock)
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
