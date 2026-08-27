import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare,
  DollarSign
} from 'lucide-react';

export const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    summary: { assigned: 0, accepted: 0, outForDelivery: 0, codPending: 0, failed: 0, deliveredToday: 0 },
    activeDeliveries: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await deliveryPartnerService.getDashboard();
      if (res) {
        setData({
          summary: res.summary || { assigned: 0, accepted: 0, outForDelivery: 0, codPending: 0, failed: 0, deliveredToday: 0 },
          activeDeliveries: res.activeDeliveries || []
        });
      }
    } catch (err) {
      console.error('Failed to load delivery partner dashboard:', err);
      showError('Failed to load delivery dashboard data.');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);

    const handleRealtimeUpdate = () => {
      fetchDashboardData(false);
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeUpdate);
    window.addEventListener('focus', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('cks_delivery_updated', handleRealtimeUpdate);
      window.removeEventListener('focus', handleRealtimeUpdate);
    };
  }, [fetchDashboardData]);

  const { summary, activeDeliveries } = data;

  const [updatingLocation, setUpdatingLocation] = useState(false);

  const handleUpdateLocation = async () => {
    const { getCurrentPosition } = await import('../../utils/location.utils');
    setUpdatingLocation(true);
    try {
      const pos = await getCurrentPosition();
      await deliveryPartnerService.updateCurrentLocation(pos.latitude, pos.longitude);
      showSuccess(`Location updated: (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)})`);
    } catch (err) {
      showError(err.message || 'Failed to update location.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Delivery Partner Dashboard 🛵</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Manage assigned orders, customer location routes, and delivery status updates
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="md"
            icon={MapPin}
            loading={updatingLocation}
            disabled={updatingLocation}
            onClick={handleUpdateLocation}
            style={{
              minHeight: '44px',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: '0.88rem',
              borderRadius: '10px'
            }}
          >
            {updatingLocation ? '📍 Locating...' : '📍 Update My Current Location'}
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={Truck}
            onClick={() => navigate('/delivery/orders')}
            style={{ minHeight: '44px', padding: '10px 16px', borderRadius: '10px' }}
          >
            All My Orders
          </Button>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        <Card padding="16px" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Assigned</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1D4ED8', marginTop: '4px' }}>
            🚚 {summary.assigned || 0}
          </div>
        </Card>

        <Card padding="16px" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>Accepted</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803D', marginTop: '4px' }}>
            📦 {summary.accepted || 0}
          </div>
        </Card>

        <Card padding="16px" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase' }}>Out For Delivery</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#B45309', marginTop: '4px' }}>
            🛵 {summary.outForDelivery || 0}
          </div>
        </Card>

        <Card padding="16px" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 800, textTransform: 'uppercase' }}>COD Pending</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#DC2626', marginTop: '4px' }}>
            💰 {summary.codPending || 0}
          </div>
        </Card>

        <Card padding="16px" style={{ background: '#FDF2F8', border: '1px solid #FBCFE8' }}>
          <div style={{ fontSize: '0.75rem', color: '#9D174D', fontWeight: 800, textTransform: 'uppercase' }}>Failed</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#BE185D', marginTop: '4px' }}>
            ⚠️ {summary.failed || 0}
          </div>
        </Card>

        <Card padding="16px" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
          <div style={{ fontSize: '0.75rem', color: '#075985', fontWeight: 800, textTransform: 'uppercase' }}>Delivered Today</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0369A1', marginTop: '4px' }}>
            ✅ {summary.deliveredToday || 0}
          </div>
        </Card>
      </div>

      {/* ACTIVE DELIVERIES LIST */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} color="#2563EB" /> My Active Deliveries ({activeDeliveries.length})
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : activeDeliveries.length === 0 ? (
          <Card padding="36px" style={{ textAlign: 'center' }}>
            <CheckCircle size={44} color="#059669" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1F2937' }}>No Active Deliveries</h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>
              You have completed or resolved all your active delivery assignments.
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeDeliveries.map(del => {
              const fullAddr = del.deliveryAddress?.fullAddressLine ||
                [del.deliveryAddress?.houseNumber, del.deliveryAddress?.street, del.deliveryAddress?.city, del.deliveryAddress?.pincode].filter(Boolean).join(', ');

              const mapsUrl = del.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr || 'Mahruni')}`;
              const whatsappUrl = `https://wa.me/91${(del.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${del.customerName}, I am your delivery partner from Chaudhary Kirana Store for order #${del.orderNumber}.`)}`;

              return (
                <Card key={del.assignmentId || del.orderId} padding="20px" style={{ borderLeft: `4px solid ${del.deliveryStatus === 'OUT_FOR_DELIVERY' ? '#E67E22' : '#2563EB'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A' }}>
                        Order #{del.orderNumber}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '2px' }}>
                        Assigned on: {new Date(del.assignedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status={del.deliveryStatus} />
                      <StatusBadge status={del.paymentStatus} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                    {/* Customer Info */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Customer & Contact</div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E293B', marginTop: '2px' }}>
                        {del.customerName}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={del.callUrl || `tel:${del.customerPhone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#059669',
                            color: '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <Phone size={14} /> Call ({del.customerPhone})
                        </a>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#25D366',
                            color: '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                      </div>
                    </div>

                    {/* Address & Navigation */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Delivery Location</div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '2px', lineHeight: 1.4 }}>
                        <MapPin size={14} color="#DC2626" style={{ display: 'inline', marginRight: '4px' }} />
                        {fullAddr}
                        {del.deliveryAddress?.landmark && (
                          <div style={{ color: '#D97706', fontWeight: 700, marginTop: '2px' }}>
                            Landmark: {del.deliveryAddress.landmark}
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <ExternalLink size={14} /> Navigate on Google Maps 🗺️
                        </a>
                      </div>
                    </div>

                    {/* Order Financials & Instructions */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Financials & Instructions</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                        {formatCurrency(del.totalAmount)} ({del.paymentMethod})
                      </div>
                      {del.deliveryInstructions && (
                        <div style={{ fontSize: '0.8rem', background: '#FFFBEB', color: '#92400E', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontStyle: 'italic' }}>
                          "{del.deliveryInstructions}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                    <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => navigate(`/delivery/orders/${del.orderId}`)}>
                      Open Delivery Workflow
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
