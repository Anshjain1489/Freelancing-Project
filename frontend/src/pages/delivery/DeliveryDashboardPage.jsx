import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Truck, PackageCheck, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export const DeliveryDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await deliveryPartnerService.getDashboard();
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to load delivery dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();

    const handleRealtimeDelivery = () => {
      fetchDashboardStats();
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeDelivery);
    return () => window.removeEventListener('cks_delivery_updated', handleRealtimeDelivery);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Delivery Partner Dashboard 🚚</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Real-time delivery assignments, active route status, and completion metrics
          </p>
        </div>
        <Button variant="primary" size="md" icon={Truck} onClick={() => navigate('/delivery/orders')}>
          View Assigned Orders
        </Button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Pending Assignments</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: (stats?.pendingAssignments || 0) > 0 ? '#E67E22' : 'var(--color-text-primary)', marginTop: '4px' }}>
            📦 {stats?.pendingAssignments || 0}
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Active Deliveries</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#06C167', marginTop: '4px' }}>
            🚚 {stats?.activeDeliveries || 0}
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Delivered Today</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary-dark)', marginTop: '4px' }}>
            ✅ {stats?.deliveredToday || 0}
          </div>
        </Card>

        <Card padding="20px">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Total Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2C3E50', marginTop: '4px' }}>
            🎉 {stats?.totalDelivered || 0}
          </div>
        </Card>
      </div>

      <Card padding="24px" style={{ background: '#FAF9FE', border: '1px solid #E2D9F3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#5A32A3' }}>Quick Actions</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
              Check your pending order assignments and update delivery progress step-by-step
            </p>
          </div>
          <Button variant="secondary" size="md" icon={ArrowRight} onClick={() => navigate('/delivery/orders')}>
            Go to My Orders List
          </Button>
        </div>
      </Card>
    </div>
  );
};
