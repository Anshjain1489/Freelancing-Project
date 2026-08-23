import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Users,
  Plus,
  Boxes,
  Truck,
  ArrowUpRight
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await adminService.getDashboard({ range });
        setData(res.data || null);
      } catch (err) {
        console.error('Failed to load admin dashboard summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [range]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="100px" borderRadius="12px" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height="120px" borderRadius="12px" />)}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const orderStatus = data?.orderStatus || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Date Range Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Store Dashboard 📊</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Real-time sales, order status & stock analytics for Chaudhary Kirana Store
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--color-surface)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          {['today', '7days', '30days', 'this_month'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                backgroundColor: range === r ? 'var(--color-primary)' : 'transparent',
                color: range === r ? '#ffffff' : 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              {r === 'today' ? "Today" : r === '7days' ? '7 Days' : r === '30days' ? '30 Days' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Revenue</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '4px' }}>
                {formatCurrency(summary.revenue || 0)}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-mint-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="var(--color-primary)" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Orders</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>
                {summary.orders || 0}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={20} color="#0284C7" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Avg Order Value</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>
                {formatCurrency(summary.averageOrderValue || 0)}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} color="#9333EA" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Low Stock Alerts</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: summary.lowStockProducts > 0 ? '#DC2626' : 'var(--color-text-primary)', marginTop: '4px' }}>
                {summary.lowStockProducts || 0}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#DC2626" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Action Buttons */}
      <Card padding="20px" style={{ backgroundColor: 'var(--color-mint-light)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>⚡ Quick Admin Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/admin/products/new')}>
            Add New Product
          </Button>
          <Button variant="outline" size="sm" icon={ShoppingBag} onClick={() => navigate('/admin/orders')}>
            Manage Orders
          </Button>
          <Button variant="outline" size="sm" icon={Truck} onClick={() => navigate('/admin/delivery')}>
            Delivery Management
          </Button>
          <Button variant="outline" size="sm" icon={Boxes} onClick={() => navigate('/admin/inventory')}>
            Update Stock
          </Button>
          <Button variant="outline" size="sm" icon={TrendingUp} onClick={() => navigate('/admin/analytics')}>
            Full Analytics Report
          </Button>
        </div>
      </Card>

      {/* Order Status Breakdown Grid */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '16px' }}>📦 Order Status Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF3C7', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706' }}>Pending Payment</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>{orderStatus.pending || 0}</div>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-mint-light)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Confirmed</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '2px' }}>{orderStatus.confirmed || 0}</div>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#E0F2FE', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284C7' }}>Processing</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>{orderStatus.processing || 0}</div>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FFF0E6', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>Out for Delivery</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-secondary)', marginTop: '2px' }}>{orderStatus.outForDelivery || 0}</div>
          </div>

          <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#DCFCE7', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A' }}>Delivered</span>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>{orderStatus.delivered || 0}</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
