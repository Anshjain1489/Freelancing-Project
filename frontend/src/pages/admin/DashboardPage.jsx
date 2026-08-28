import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Plus,
  Boxes,
  Truck,
  ArrowRight,
  Receipt,
  Globe,
  Ban,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [deliveryStats, setDeliveryStats] = useState({
    unassignedOrders: 0,
    assignedOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    failedDeliveries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const [res, delRes] = await Promise.allSettled([
          adminService.getDashboardOverview(),
          deliveryPartnerService.getAdminDeliveryDashboard()
        ]);

        if (res.status === 'fulfilled') {
          setOverview(res.value?.data || null);
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
        console.error('Failed to load admin dashboard overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

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

  const o = overview || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Executive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Store Owner Dashboard 📊
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Live executive summary, POS vs Online sales, financial KPIs & inventory valuation for Chaudhary Kirana Store
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" size="sm" icon={TrendingUp} onClick={() => navigate('/admin/analytics')}>
            Full BI Analytics →
          </Button>
          <Button variant="outline" size="sm" icon={Receipt} onClick={() => navigate('/admin/pos')}>
            Open POS Counter
          </Button>
        </div>
      </div>

      {/* Hero Revenue Executive Highlight Card */}
      <div style={{
        backgroundColor: '#047857',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(4,120,87,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#A7F3D0' }}>
              Today's Combined Sales (IST)
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {formatCurrency(o.todayRevenue || 0)}
              <span style={{
                fontSize: '0.85rem',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: (o.revenueGrowthPct || 0) >= 0 ? '#064E3B' : '#7F1D1D',
                color: (o.revenueGrowthPct || 0) >= 0 ? '#34D399' : '#FCA5A5',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {(o.revenueGrowthPct || 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(o.revenueGrowthPct || 0)}% vs yesterday
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: '#A7F3D0', fontWeight: 700 }}>Total Orders Today</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{o.todayOrdersCount || 0} Orders</div>
          </div>
        </div>

        {/* 4 Mini Metrics Inside Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#D1FAE5' }}>🏪 POS Sales</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatCurrency(o.todayPosSales || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#D1FAE5' }}>🌐 Online Orders</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatCurrency(o.todayOnlineSales || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#D1FAE5' }}>🛒 Avg Order Value (AOV)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatCurrency(o.avgOrderValue || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#D1FAE5' }}>📦 Items Sold</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{o.itemsSoldCount || 0} units</div>
          </div>
        </div>
      </div>

      {/* 4 Main Secondary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Cancelled Orders</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {o.cancelledOrdersCount || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                Impact: -{formatCurrency(o.refundImpact || 0)}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ban size={20} color="#DC2626" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Low Stock Items</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (o.lowStockCount || 0) > 0 ? '#D97706' : '#047857', marginTop: '2px' }}>
                {o.lowStockCount || 0} SKUs
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                Requires reorder threshold
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#D97706" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Out of Stock</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (o.outOfStockCount || 0) > 0 ? '#DC2626' : '#047857', marginTop: '2px' }}>
                {o.outOfStockCount || 0} SKUs
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                Zero inventory items
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={20} color="#DC2626" />
            </div>
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Delivered Today</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                {deliveryStats.deliveredToday} Orders
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                Active fleet deliveries
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} color="#047857" />
            </div>
          </div>
        </Card>
      </div>

      {/* Delivery Management Fleet Card */}
      <Card padding="24px" style={{ border: '2px solid #06C167', backgroundColor: '#F8FCFA' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={24} color="#047857" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                🚚 Delivery Fleet Dispatch Summary
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Live dispatch status, unassigned orders, and delivery partner tracking
            </p>
          </div>

          <Button variant="primary" size="md" icon={ArrowRight} onClick={() => navigate('/admin/delivery')} style={{ fontWeight: 800 }}>
            Delivery Console →
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #E74C3C', background: '#FDEDEC' }}>
            <div style={{ fontSize: '0.72rem', color: '#78281F', textTransform: 'uppercase', fontWeight: 800 }}>🚚 Unassigned</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#C0392B', marginTop: '2px' }}>{deliveryStats.unassignedOrders}</div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #F39C12', background: '#FEF9E7' }}>
            <div style={{ fontSize: '0.72rem', color: '#7E5109', textTransform: 'uppercase', fontWeight: 800 }}>📦 Assigned</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D68910', marginTop: '2px' }}>{deliveryStats.assignedOrders}</div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #3498DB', background: '#EBF5FB' }}>
            <div style={{ fontSize: '0.72rem', color: '#1B4F72', textTransform: 'uppercase', fontWeight: 800 }}>🛵 Out For Delivery</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2980B9', marginTop: '2px' }}>{deliveryStats.outForDelivery}</div>
          </div>

          <div onClick={() => navigate('/admin/delivery')} style={{ cursor: 'pointer', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #2ECC71', background: '#EAFAF1' }}>
            <div style={{ fontSize: '0.72rem', color: '#145A32', textTransform: 'uppercase', fontWeight: 800 }}>✅ Delivered Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#27AE60', marginTop: '2px' }}>{deliveryStats.deliveredToday}</div>
          </div>
        </div>
      </Card>

      {/* Quick Action Navigation Grid */}
      <Card padding="20px" style={{ backgroundColor: '#F8FAFC' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: '#0F172A' }}>⚡ Quick Admin Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" icon={Receipt} onClick={() => navigate('/admin/pos')}>
            🧾 POS Billing Counter
          </Button>
          <Button variant="outline" size="sm" icon={TrendingUp} onClick={() => navigate('/admin/analytics')}>
            📈 Business Intelligence Center
          </Button>
          <Button variant="outline" size="sm" icon={Plus} onClick={() => navigate('/admin/products/new')}>
            ➕ Add Product
          </Button>
          <Button variant="outline" size="sm" icon={Boxes} onClick={() => navigate('/admin/inventory')}>
            📦 Inventory Valuation
          </Button>
        </div>
      </Card>
    </div>
  );
};
