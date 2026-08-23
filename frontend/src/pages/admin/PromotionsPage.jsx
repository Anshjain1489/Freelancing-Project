import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Tag, Plus } from 'lucide-react';

export const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      setLoading(true);
      try {
        const res = await adminService.getPromotions();
        setPromotions(res.data?.promotions || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchPromos();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Promotions & Offers 🏷</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Manage discount coupons and promotional banners
          </p>
        </div>
        <Button variant="primary" icon={Plus}>Create Offer</Button>
      </div>

      <Card padding="20px">
        {loading ? (
          <TableRowSkeleton />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Title</th>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Discount</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800 }}>{p.title}</td>
                    <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-secondary)' }}>{p.code || 'SAVE50'}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{p.discountPercent || 10}% OFF</td>
                    <td style={{ padding: '12px 10px' }}><Badge variant="green">ACTIVE</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
