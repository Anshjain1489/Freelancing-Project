import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  XCircle,
  UserCheck,
  MapPin,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

export const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastUpdatedAtRef = React.useRef(0);

  const fetchTracking = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await orderService.getOrderTracking(orderId);
      if (res.data || res.order) {
        const tData = res.data || res;
        const fetchedUpdatedAt = Date.parse(tData.order?.updated_at || tData.order?.updatedAt || 0) || Date.now();

        // Race Condition Safeguard: Only apply API response if its timestamp >= last applied timestamp
        if (fetchedUpdatedAt >= lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = fetchedUpdatedAt;
          setTrackingData(tData);
          setError(null);

          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setError(err.response?.data?.message || 'Failed to load order tracking details.');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [orderId]);

  const handleRealtimeUpdate = useCallback((e) => {
    const detail = e.detail || {};
    const targetId = String(detail.orderId || detail.id || '');
    if (!targetId || targetId === String(orderId)) {
      const eventTimestamp = Date.parse(detail.updatedAt || detail.timestamp || 0) || Date.now();

      // Race condition safeguard
      if (eventTimestamp >= lastUpdatedAtRef.current) {
        lastUpdatedAtRef.current = eventTimestamp;

        // 1. Optimistic React State Update for Instantaneous UI Re-render
        if (detail.status) {
          setTrackingData(prev => {
            if (!prev || !prev.order) return prev;
            return {
              ...prev,
              order: {
                ...prev.order,
                status: detail.status
              }
            };
          });
        }

        // 2. Authoritative Backend API Refetch
        fetchTracking(false);
      }
    }
  }, [orderId, fetchTracking]);

  const handleFocus = useCallback(() => {
    fetchTracking(false);
  }, [fetchTracking]);

  useEffect(() => {
    fetchTracking(true);

    window.addEventListener('cks_order_tracking_updated', handleRealtimeUpdate);
    window.addEventListener('cks_order_status_updated', handleRealtimeUpdate);
    window.addEventListener('cks_delivery_updated', handleRealtimeUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('cks_order_tracking_updated', handleRealtimeUpdate);
      window.removeEventListener('cks_order_status_updated', handleRealtimeUpdate);
      window.removeEventListener('cks_delivery_updated', handleRealtimeUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [orderId, fetchTracking, handleRealtimeUpdate, handleFocus]);

  // Fallback Polling (30s Interval) for Active Orders
  useEffect(() => {
    const currentStatus = trackingData?.order?.status;
    const terminalStates = ['DELIVERED', 'CANCELLED', 'REJECTED'];

    if (!currentStatus || terminalStates.includes(currentStatus)) {
      return; // Stop polling on terminal states
    }

    const intervalId = setInterval(() => {
      fetchTracking(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [trackingData?.order?.status, fetchTracking]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="40px" width="240px" />
        <Skeleton height="180px" borderRadius="16px" />
        <Skeleton height="350px" borderRadius="16px" />
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '24px' }}>
        <Card padding="32px">
          <AlertCircle size={48} color="#DC2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937', marginBottom: '8px' }}>
            Unable to Load Tracking
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>
            {error || 'The requested order tracking details could not be found or you do not have permission to view them.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/orders')}>
              Back to My Orders
            </Button>
            <Button variant="primary" icon={RefreshCw} onClick={() => fetchTracking(true)}>
              Retry Loading
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { order, timeline } = trackingData;

  const getStepIcon = (state, defaultIndex) => {
    switch (state) {
      case 'COMPLETED':
        return <CheckCircle2 size={20} color="#FFFFFF" />;
      case 'ACTIVE':
        return <Clock size={20} color="#FFFFFF" />;
      case 'TERMINATED':
        return <XCircle size={20} color="#FFFFFF" />;
      case 'FAILED':
        return <AlertCircle size={20} color="#FFFFFF" />;
      default:
        return <span style={{ color: '#6B7280', fontWeight: 800, fontSize: '0.85rem' }}>{defaultIndex}</span>;
    }
  };

  const getStepBg = (state) => {
    switch (state) {
      case 'COMPLETED':
        return '#059669'; // Green
      case 'ACTIVE':
        return '#2563EB'; // Blue
      case 'TERMINATED':
        return '#DC2626'; // Red
      case 'FAILED':
        return '#D97706'; // Amber
      default:
        return '#E5E7EB'; // Light Grey
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[
        { label: 'My Orders', to: '/orders' },
        { label: `Order #${order.orderNumber}`, to: `/orders/${order.id}` },
        { label: 'Live Tracking' }
      ]} />

      {/* HEADER BANNER */}
      <Card padding="24px" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                Order #{order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              Placed on: {new Date(order.createdAt).toLocaleString()} • Total: <strong style={{ color: '#38BDF8' }}>{formatCurrency(order.totalAmount)}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#F1F5F9', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
              <Clock size={16} color="#38BDF8" /> {order.estimatedDelivery}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Auto-updating via SSE • Last synced: {lastRefreshed.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {order.deliveryPartner?.name && (
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
            <UserCheck size={18} color="#4ADE80" />
            <span>Assigned Delivery Fleet Partner: <strong>{order.deliveryPartner.name}</strong></span>
          </div>
        )}
      </Card>

      {/* VISUAL TIMELINE CARD */}
      <Card padding="28px">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} color="#2563EB" /> Real-Time Fulfillment Timeline 🚚
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {timeline?.map((step, idx) => {
            const isLast = idx === timeline.length - 1;
            const bg = getStepBg(step.state);

            return (
              <div key={step.key || idx} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: isLast ? '0' : '28px' }}>
                {/* Vertical Connecting Line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '17px',
                      top: '34px',
                      bottom: '0',
                      width: '2px',
                      backgroundColor: step.state === 'COMPLETED' ? '#059669' : '#E5E7EB',
                      transition: 'all 0.3s ease'
                    }}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    boxShadow: step.state === 'ACTIVE' ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                    animation: step.state === 'ACTIVE' ? 'pulse 2s infinite' : 'none',
                    flexShrink: 0
                  }}
                >
                  {getStepIcon(step.state, idx + 1)}
                </div>

                {/* Step Details */}
                <div style={{ flex: 1, paddingTop: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{
                      fontSize: '0.98rem',
                      fontWeight: step.state === 'ACTIVE' || step.state === 'COMPLETED' ? 800 : 600,
                      color: step.state === 'TERMINATED' || step.state === 'FAILED' ? '#DC2626' : (step.state === 'UPCOMING' ? '#9CA3AF' : '#1F2937'),
                      margin: 0
                    }}>
                      {step.title}
                    </h3>

                    {step.createdAt && (
                      <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                        {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <p style={{
                    fontSize: '0.85rem',
                    color: step.state === 'UPCOMING' ? '#9CA3AF' : '#4B5563',
                    marginTop: '4px',
                    margin: '4px 0 0 0'
                  }}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* QUICK ACTIONS FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(`/orders/${order.id}`)}>
          View Full Order Details
        </Button>
        <Button variant="secondary" icon={RefreshCw} onClick={() => fetchTracking(true)}>
          Refresh Tracking
        </Button>
      </div>
    </div>
  );
};
