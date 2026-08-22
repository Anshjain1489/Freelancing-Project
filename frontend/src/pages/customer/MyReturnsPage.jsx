import React, { useEffect, useState } from 'react';
import { returnService } from '../../services/return.service';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { RotateCcw } from 'lucide-react';

export const MyReturnsPage = () => {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await returnService.getMyReturns();
      setReturnsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
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
        <RotateCcw color="var(--color-primary)" size={24} /> My Return Requests
      </h1>

      {returnsList.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#666' }}>
          No return requests found.
        </Card>
      ) : (
        returnsList.map((item) => (
          <Card key={item.id} padding="20px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Return #{item.return_number || item.id}</h3>
                <span style={{ fontSize: '0.8rem', color: '#777' }}>
                  Order #{item.orders?.order_number || item.order_id} • {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <StatusBadge status={item.status} />
                <StatusBadge status={item.refund_status} />
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#444' }}>
              <strong>Reason:</strong> {item.reason}
            </div>
            {item.return_items && item.return_items.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Return Items:</div>
                {item.return_items.map((ri, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', color: '#333' }}>
                    • Qty {ri.quantity} (Refund: {formatCurrency(ri.refund_amount)})
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
};
