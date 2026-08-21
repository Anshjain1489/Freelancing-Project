import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { Users } from 'lucide-react';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCust = async () => {
      setLoading(true);
      try {
        const res = await adminService.getCustomers();
        setCustomers(res.data?.items || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchCust();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 className="text-h1">Customer Directory 👥</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Registered customers and lifetime purchasing history
        </p>
      </div>

      <Card padding="20px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Customer Name</th>
                  <th style={{ padding: '10px' }}>Mobile Number</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Total Orders</th>
                  <th style={{ padding: '10px' }}>Lifetime Spend</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 800 }}>{c.fullName}</td>
                    <td style={{ padding: '12px 10px' }}>{c.phone}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>{c.email || '—'}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{c.totalOrders}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{formatCurrency(c.totalSpend)}</td>
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
