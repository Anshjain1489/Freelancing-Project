import React, { useEffect, useState } from 'react';
import { cancellationService } from '../../services/cancellation.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const AdminCancellationsPage = () => {
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const data = await cancellationService.getAdminCancellations();
      setCancellations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load cancellations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, []);

  const handleApprove = async (id) => {
    setProcessing(true);
    try {
      const res = await cancellationService.approveCancellation(id);
      showSuccess(res.message || 'Cancellation approved');
      fetchCancellations();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve cancellation');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showError('Rejection reason is required');
      return;
    }
    setProcessing(true);
    try {
      const res = await cancellationService.rejectCancellation(selectedReq.id, rejectReason);
      showSuccess(res.message || 'Cancellation request rejected');
      setIsRejectModalOpen(false);
      setRejectReason('');
      fetchCancellations();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reject cancellation');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = statusFilter === 'ALL'
    ? cancellations
    : cancellations.filter(c => c.status === statusFilter);

  const pendingCount = cancellations.filter(c => c.status === 'REQUESTED').length;
  const approvedCount = cancellations.filter(c => c.status === 'APPROVED' || c.status === 'CANCELLED').length;
  const rejectedCount = cancellations.filter(c => c.status === 'REJECTED').length;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="text-h1">Order Cancellation Requests</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Review, approve, or reject customer order cancellation requests.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card padding="16px">
          <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 600 }}>PENDING APPROVAL</span>
          <h2 style={{ fontSize: '1.6rem', color: '#D35400', fontWeight: 800 }}>{pendingCount}</h2>
        </Card>
        <Card padding="16px">
          <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 600 }}>APPROVED & CANCELLED</span>
          <h2 style={{ fontSize: '1.6rem', color: '#27AE60', fontWeight: 800 }}>{approvedCount}</h2>
        </Card>
        <Card padding="16px">
          <span style={{ fontSize: '0.8rem', color: '#777', fontWeight: 600 }}>REJECTED REQUESTS</span>
          <h2 style={{ fontSize: '1.6rem', color: '#C0392B', fontWeight: 800 }}>{rejectedCount}</h2>
        </Card>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {['ALL', 'REQUESTED', 'APPROVED', 'REJECTED'].map(st => (
          <Button
            key={st}
            variant={statusFilter === st ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(st)}
          >
            {st === 'REQUESTED' ? 'Pending' : st}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Skeleton height="150px" borderRadius="12px" />
      ) : filtered.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#777' }}>
          No cancellation requests found.
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(item => (
            <Card key={item.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                    Order #{item.orders?.order_number || item.order_id}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Requested by: {item.orders?.users?.full_name || 'Customer'} ({item.orders?.users?.phone || 'N/A'}) • {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div style={{ marginTop: '12px', background: '#FAF9FE', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#333' }}>
                <strong>Reason:</strong> {item.request_reason || 'N/A'}<br />
                <strong>Order Total:</strong> {formatCurrency(item.orders?.total_amount || 0)} ({item.orders?.payment_method})
              </div>

              {item.status === 'REQUESTED' && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    onClick={() => { setSelectedReq(item); setIsRejectModalOpen(true); }}
                  >
                    Reject Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    loading={processing}
                    onClick={() => handleApprove(item.id)}
                  >
                    Approve Cancellation & Refund
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Cancellation Request">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            Specify the reason for rejecting cancellation for Order #{selectedReq?.orders?.order_number || selectedReq?.order_id}.
          </p>
          <Input
            label="Rejection Reason"
            placeholder="e.g. Order already packed and in transit"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={processing} onClick={handleReject}>Reject Cancellation</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
