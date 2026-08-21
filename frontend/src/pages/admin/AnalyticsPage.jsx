import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { TrendingUp, Award } from 'lucide-react';

export const AnalyticsPage = () => {
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [revRes, topRes] = await Promise.all([
          adminService.getRevenueAnalytics(),
          adminService.getTopProductsAnalytics()
        ]);
        setRevenueTrend(revRes.data?.trend || []);
        setTopProducts(topRes.data?.products || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="text-h1">Business Intelligence & Analytics 📈</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          Revenue trends and top-performing product insights for Chaudhary Kirana Store
        </p>
      </div>

      {loading ? (
        <Skeleton height="300px" borderRadius="12px" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* Revenue Trend Table */}
          <Card padding="24px">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--color-primary)" /> Daily Revenue Performance
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Collected Paid Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueTrend.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{row.date}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Selling Products */}
          <Card padding="24px">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--color-secondary)" /> Top Selling Products
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '10px' }}>Rank</th>
                    <th style={{ padding: '10px' }}>Product Name</th>
                    <th style={{ padding: '10px' }}>Units Sold</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>#{idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: 800 }}>{p.name}</td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{p.quantitySold} units</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                        {formatCurrency(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
