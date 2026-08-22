import React, { useEffect, useState } from 'react';
import { replacementService } from '../../services/replacement.service';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Repeat } from 'lucide-react';

export const MyReplacementsPage = () => {
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      const data = await replacementService.getMyReplacements();
      setReplacements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load replacements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplacements();
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
        <Repeat color="var(--color-secondary)" size={24} /> My Replacement Requests
      </h1>

      {replacements.length === 0 ? (
        <Card padding="32px" style={{ textAlign: 'center', color: '#666' }}>
          No replacement requests found.
        </Card>
      ) : (
        replacements.map((item) => (
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
              <strong>Reason:</strong> {item.reason}
            </div>
            {item.description && (
              <div style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
                <strong>Description:</strong> {item.description}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
};
