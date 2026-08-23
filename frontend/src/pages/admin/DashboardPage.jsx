import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
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
  ArrowRight,
  CheckCircle2,
  Clock,
  Package
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deliveryStats, setDeliveryStats] = useState({
    unassignedOrders: 0,
    assignedOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    failedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('today');

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const [res, delRes] = await Promise.allSettled([
          adminService.getDashboard({ range }),
          deliveryPartnerService.getAdminDeliveryDashboard()
        ]);

        if (res.status === 'fulfilled') {
          setData(res.value?.data || null);
        }

        if (delRes.status === 'fulfilled') {
          const stats = delRes.value?.data || delRes.value || {};
          setDeliveryStats({
            unassignedOrders: stats.unassignedOrders ?? 0,
            assignedOrders: stats.assignedOrders ?? 0,
            outForDelivery: stats.outForDelivery ?? 0,
            deliveredToday: stats.deliveredToday ?? 0,
            failedDeliveries: stats.failedDeliveries ?? 0
          });
        }
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

      {/* 🚚 DELIVERY MANAGEMENT FEATURED DASHBOARD CARD & STATS */}
      <Card padding="24px" style={{ border: '2px solid var(--color-primary)', backgroundColor: '#F8FCFA' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={24} color="var(--color-primary-dark)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>
                🚚 Delivery Management & Fleet Summary
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px', margin: 0 }}>
              Assign delivery partners, view customer phone & address, and track dispatch status in real-time
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            onClick={() => navigate('/admin/delivery')}
            style={{ fontWeight: 800 }}
          >
            Manage Deliveries →
          </Button>
        </div>

        {/* 5 Delivery Dashboard Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #E74C3C', background: '#FDEDEC' }}>
            <div style={{ fontSize: '0.72rem', color: '#78281F', textTransform: 'uppercase', fontWeight: 800 }}>🚚 Unassigned</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#C0392B', marginTop: '2px' }}>
              {deliveryStats.unassignedOrders}
            </div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #F39C12', background: '#FEF9E7' }}>
            <div style={{ fontSize: '0.72rem', color: '#7E5109', textTransform: 'uppercase', fontWeight: 800 }}>📦 Assigned</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D68910', marginTop: '2px' }}>
              {deliveryStats.assignedOrders}
            </div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3498DB', background: '#EBF5FB' }}>
            <div style={{ fontSize: '0.72rem', color: '#1B4F72', textTransform: 'uppercase', fontWeight: 800 }}>🛵 Out For Delivery</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2980B9', marginTop: '2px' }}>
              {deliveryStats.outForDelivery}
            </div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ECC71', background: '#EAFAF1' }}>
            <div style={{ fontSize: '0.72rem', color: '#145A32', textTransform: 'uppercase', fontWeight: 800 }}>✅ Delivered Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#27AE60', marginTop: '2px' }}>
              {deliveryStats.deliveredToday}
            </div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #8E44AD', background: '#F4ECF7' }}>
            <div style={{ fontSize: '0.72rem', color: '#4A235A', textTransform: 'uppercase', fontWeight: 800 }}>⚠️ Failed Deliveries</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#8E44AD', marginTop: '2px' }}>
              {deliveryStats.failedDeliveries}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Action Buttons */}
      <Card padding="20px" style={{ backgroundColor: 'var(--color-mint-light)' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>⚡ Quick Admin Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={Truck} onClick={() => navigate('/admin/delivery')}>
            🚚 Delivery Management
          </Button>
          <Button variant="outline" size="sm" icon={Plus} onClick={() => navigate('/admin/products/new')}>
            Add New Product
          </Button>
          <Button variant="outline" size="sm" icon={ShoppingBag} onClick={() => navigate('/admin/orders')}>
            Manage Orders
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

