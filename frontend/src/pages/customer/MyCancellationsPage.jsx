import React, { useEffect, useState } from 'react';
import { cancellationService } from '../../services/cancellation.service';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { XCircle } from 'lucide-react';

export const MyCancellationsPage = () => {
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const data = await cancellationService.getMyCancellations();
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

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton height="100px" borderRadius="12px" />
        <Skeleton height="100px" borderRadius="12px" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle color="var(--color-danger)" size={24} /> My Cancellation Requests
      </h1>

      {cancellations.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#666' }}>
          No cancellation requests found.
        </Card>
      ) : (
        cancellations.map((item) => (
          <Card key={item.id} padding="20px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Order #{item.orders?.order_number || item.order_id}</h3>
                <span style={{ fontSize: '0.8rem', color: '#777' }}>
                  Requested on: {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#444' }}>
              <strong>Reason:</strong> {item.request_reason || 'N/A'}
            </div>
            {item.rejection_reason && (
              <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#C0392B' }}>
                <strong>Rejection Reason:</strong> {item.rejection_reason}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
};
