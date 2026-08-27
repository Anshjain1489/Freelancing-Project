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
  const [range, setRange] = useState('7days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = async (selectedRange, customStart, customEnd) => {
    setLoading(true);
    try {
      const params = { range: selectedRange };
      if (selectedRange === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const [revRes, topRes] = await Promise.all([
        adminService.getRevenueAnalytics(params),
        adminService.getTopProductsAnalytics(params)
      ]);
      setRevenueTrend(revRes.data?.trend || []);
      setTopProducts(topRes.data?.products || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range, startDate, endDate);
  }, [range]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1">Business Intelligence & Analytics 📈</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Revenue trends and top-performing product insights for Chaudhary Kirana Store
          </p>
        </div>

        {/* P3-20: Date Range Selector Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#F8FAFC', padding: '6px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          {[
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'custom', label: 'Custom Range' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => handleRangeChange(r.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: range === r.id ? '1px solid #06C167' : '1px solid #CBD5E1',
                background: range === r.id ? '#E8F7F0' : '#FFF',
                color: range === r.id ? '#048848' : '#334155',
                fontWeight: range === r.id ? 800 : 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {r.label}
            </button>
          ))}

          {range === 'custom' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '6px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #CCC', fontSize: '0.75rem' }}
              />
              <span style={{ fontSize: '0.75rem' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #CCC', fontSize: '0.75rem' }}
              />
              <button
                type="button"
                onClick={() => fetchAnalytics('custom', startDate, endDate)}
                style={{ padding: '4px 10px', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
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
