import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deliveryPartnerService } from '../../services/deliveryPartner.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare,
  DollarSign,
  ArrowLeft,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const DeliveryOrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // COD Cash Collection Modal State
  const [isCodModalOpen, setIsCodModalOpen] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState('');

  // Failure Modal State
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState('CUSTOMER_UNAVAILABLE');
  const [failureNotes, setFailureNotes] = useState('');

  // Phase 25: OTP Verification & Proof State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [inputOtp, setInputOtp] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  const fetchOrderDetails = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await deliveryPartnerService.getOrderById(orderId);
      if (res.order || res.data) {
        const fetched = res.order || res.data;
        setOrder(fetched);
        setCollectedAmount(String(fetched.totalAmount || ''));
        setIsOtpVerified(Boolean(fetched.deliveryOtpVerifiedAt || fetched.delivery_otp_verified_at));
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch delivery order details:', err);
      setError(err.response?.data?.message || 'Failed to load delivery order details.');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails(true);

    const handleRealtimeUpdate = (e) => {
      const detail = e.detail || {};
      const targetId = String(detail.orderId || detail.id || '');
      if (!targetId || targetId === String(orderId)) {
        fetchOrderDetails(false);
      }
    };

    window.addEventListener('cks_delivery_updated', handleRealtimeUpdate);
    window.addEventListener('focus', () => fetchOrderDetails(false));

    return () => {
      window.removeEventListener('cks_delivery_updated', handleRealtimeUpdate);
      window.removeEventListener('focus', () => fetchOrderDetails(false));
    };
  }, [orderId, fetchOrderDetails]);

  // Workflow Handlers
  const handleAcceptDelivery = async () => {
    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.acceptDelivery(orderId);
      showSuccess(res.message || 'Delivery assignment accepted! 📦');
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to accept delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.startDelivery(orderId);
      showSuccess(res.message || 'Delivery started! Order is Out For Delivery 🛵');
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!inputOtp || inputOtp.trim().length !== 6) {
      showError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.verifyDeliveryOtp(orderId, inputOtp.trim());
      showSuccess(res.message || 'OTP verified successfully! Delivery completion unlocked. 🔓');
      setIsOtpVerified(true);
      setIsOtpModalOpen(false);
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompletePrepaidDelivery = async () => {
    if (!isOtpVerified && !order?.deliveryOtpVerifiedAt && !order?.delivery_otp_verified_at) {
      showError('Delivery OTP verification is required before marking order as delivered.');
      setIsOtpModalOpen(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.completeDelivery(orderId, {
        codCollected: false,
        recipientName: recipientName || null,
        proofImageUrl: proofImageUrl || null
      });
      showSuccess(res.message || 'Order delivered successfully! 🎉');
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to complete delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCodCompletion = async () => {
    if (!isOtpVerified && !order?.deliveryOtpVerifiedAt && !order?.delivery_otp_verified_at) {
      showError('Delivery OTP verification is required before completing COD delivery.');
      setIsOtpModalOpen(true);
      return;
    }

    const numCollected = Number(collectedAmount);
    const orderTotal = Number(order.totalAmount);

    if (isNaN(numCollected) || Math.abs(numCollected - orderTotal) >= 0.01) {
      showError(`Collected cash amount (₹${numCollected}) must equal order total (₹${orderTotal})`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.completeDelivery(orderId, {
        codCollected: true,
        collectedAmount: numCollected,
        recipientName: recipientName || null,
        proofImageUrl: proofImageUrl || null
      });
      showSuccess(res.message || 'Cash collected & Order marked Delivered successfully! 💰🎉');
      setIsCodModalOpen(false);
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to complete COD delivery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmFailure = async () => {
    if (!failureReason) {
      showError('Please select a valid failure reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await deliveryPartnerService.failDelivery(orderId, failureReason, failureNotes);
      showSuccess(res.message || 'Delivery failure reported. Admin notified.');
      setIsFailureModalOpen(false);
      fetchOrderDetails(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit failure report.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="40px" width="240px" />
        <Skeleton height="180px" borderRadius="16px" />
        <Skeleton height="350px" borderRadius="16px" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '24px' }}>
        <Card padding="32px">
          <AlertCircle size={48} color="#DC2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1F2937', marginBottom: '8px' }}>
            Access Restricted or Order Not Found
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>
            {error || 'You do not have authorization to view this delivery assignment.'}
          </p>
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/delivery/dashboard')}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const isCod = order.paymentMethod === 'COD';
  const isAssigned = order.deliveryStatus === 'ASSIGNED';
  const isAccepted = order.deliveryStatus === 'ACCEPTED';
  const isOutForDelivery = ['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(order.deliveryStatus);
  const isDelivered = order.deliveryStatus === 'DELIVERED';
  const isFailed = ['FAILED', 'FAILED_DELIVERY'].includes(order.deliveryStatus);

  const fullAddr = order.deliveryAddress?.fullAddressLine ||
    [order.deliveryAddress?.houseNumber, order.deliveryAddress?.street, order.deliveryAddress?.city, order.deliveryAddress?.pincode || order.address?.postal_code].filter(Boolean).join(', ');

  const mapsUrl = order.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr || 'Mahruni')}`;
  const whatsappUrl = `https://wa.me/91${(order.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${order.customerName}, I am your delivery partner from Chaudhary Kirana Store for order #${order.orderNumber}.`)}`;

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[
        { label: 'Delivery Dashboard', to: '/delivery/dashboard' },
        { label: `Delivery Order #${order.orderNumber}` }
      ]} />

      {/* HEADER BANNER */}
      <Card padding="24px" style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', color: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#F8FAFC' }}>
                Order #{order.orderNumber}
              </h1>
              <StatusBadge status={order.deliveryStatus} />
              <StatusBadge status={order.paymentStatus} />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              Assigned At: {new Date(order.assignedAt || Date.now()).toLocaleString()} • Payment Mode: <strong style={{ color: isCod ? '#F59E0B' : '#38BDF8' }}>{order.paymentMethod}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38BDF8' }}>
              {formatCurrency(order.totalAmount)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
              {isCod ? '💰 Cash to Collect on Delivery' : '💳 Prepaid Online Order'}
            </div>
          </div>
        </div>
      </Card>

      {/* WORKFLOW ACTION BAR */}
      <Card padding="20px" style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Current Delivery Status: <span style={{ color: '#2563EB' }}>{order.deliveryStatus}</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Execute the next required delivery step in sequence
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isAssigned && (
              <Button variant="primary" size="md" loading={actionLoading} icon={Package} onClick={handleAcceptDelivery}>
                Accept Delivery Assignment
              </Button>
            )}

            {isAccepted && (
              <Button variant="primary" size="md" loading={actionLoading} icon={Truck} onClick={handleStartDelivery}>
                🛵 Start Delivery (Out For Delivery)
              </Button>
            )}

            {isOutForDelivery && !isOtpVerified && (
              <Button variant="warning" size="md" loading={actionLoading} icon={Lock} onClick={() => setIsOtpModalOpen(true)} style={{ background: '#4F46E5', color: '#FFF' }}>
                🔐 Verify Customer OTP
              </Button>
            )}

            {isOutForDelivery && isOtpVerified && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#15803D', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                <CheckCircle size={16} /> OTP Verified
              </div>
            )}

            {isOutForDelivery && !isCod && (
              <Button variant="primary" size="md" loading={actionLoading} disabled={!isOtpVerified} icon={CheckCircle} onClick={handleCompletePrepaidDelivery}>
                ✅ Mark Delivered
              </Button>
            )}

            {isOutForDelivery && isCod && (
              <Button variant="primary" size="md" loading={actionLoading} disabled={!isOtpVerified} icon={DollarSign} onClick={() => setIsCodModalOpen(true)}>
                💰 Collect Cash & Complete Delivery
              </Button>
            )}

            {!isDelivered && !isFailed && (
              <Button variant="danger" size="md" loading={actionLoading} icon={AlertTriangle} onClick={() => setIsFailureModalOpen(true)}>
                ⚠️ Report Delivery Failure
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* CUSTOMER & LOCATION CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* CUSTOMER CONTACT CARD */}
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={18} color="#059669" /> Customer Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Recipient Name</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>{order.customerName}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Phone Number</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{order.customerPhone}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              <a
                href={order.callUrl || `tel:${order.customerPhone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <Phone size={16} /> 📞 Call Customer
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#25D366',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                <MessageSquare size={16} /> 📲 WhatsApp
              </a>
            </div>
          </div>
        </Card>

        {/* LOCATION & NAVIGATION CARD */}
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#DC2626" /> Delivery Address
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.5 }}>
              {fullAddr}
            </div>

            {order.deliveryAddress?.landmark && (
              <div style={{ background: '#FFFBEB', color: '#92400E', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                Landmark: {order.deliveryAddress.landmark}
              </div>
            )}

            {order.deliveryInstructions && (
              <div style={{ background: '#F1F5F9', color: '#334155', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong>Instructions:</strong> {order.deliveryInstructions}
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                <ExternalLink size={16} /> 🗺️ Open Google Maps Navigation
              </a>
            </div>
          </div>
        </Card>
      </div>

      {/* ORDER ITEMS TABLE CARD */}
      <Card padding="24px">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} color="#2563EB" /> Order Items Summary ({order.items?.length || 0})
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Item Name</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Quantity</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0F172A' }}>{item.name}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* OTP VERIFICATION MODAL */}
      {isOtpModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="28px" style={{ width: '90%', maxWidth: '440px', background: '#FFFFFF', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={24} color="#4F46E5" /> Verify Customer OTP Code
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '16px' }}>
              Ask the customer for the 6-digit OTP code shown on their live tracking screen before handing over the parcel.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                6-Digit Delivery OTP *
              </label>
              <input
                type="text"
                maxLength={6}
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '2px solid #6366F1',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  letterSpacing: '8px',
                  color: '#1E1B4B'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                Recipient Name (Optional Proof)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Ramesh Kumar (Self / Family)"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button variant="outline" size="sm" onClick={() => setIsOtpModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleVerifyOtp} style={{ background: '#4F46E5' }}>
                Verify OTP Code 🔓
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* COD CASH COLLECTION CONFIRMATION MODAL */}
      {isCodModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="28px" style={{ width: '90%', maxWidth: '440px', background: '#FFFFFF', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={24} /> Confirm Cash Collection (COD)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '16px' }}>
              Please verify and confirm the exact cash amount collected from the customer before completing delivery.
            </p>

            <div style={{ background: '#FFFBEB', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 800, textTransform: 'uppercase' }}>Required Order Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#B45309', marginTop: '2px' }}>
                {formatCurrency(order.totalAmount)}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                Cash Amount Collected (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                placeholder="Enter exact collected amount..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#0F172A'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setIsCodModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={actionLoading} onClick={handleConfirmCodCompletion}>
                Confirm Cash & Complete Delivery
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* DELIVERY FAILURE REPORT MODAL */}
      {isFailureModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="28px" style={{ width: '90%', maxWidth: '460px', background: '#FFFFFF', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={24} /> Report Delivery Failure
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4B5563', marginBottom: '16px' }}>
              Select the primary reason for delivery failure. Internal notes are visible only to store admins.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                Failure Reason *
              </label>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0F172A'
                }}
              >
                <option value="CUSTOMER_UNAVAILABLE">Customer unavailable / Door locked</option>
                <option value="WRONG_ADDRESS">Wrong delivery address / Unable to locate</option>
                <option value="CUSTOMER_REFUSED">Customer refused order</option>
                <option value="UNABLE_TO_CONTACT">Unable to contact customer / Phone unreachable</option>
                <option value="ADDRESS_NOT_ACCESSIBLE">Address not accessible / Blocked road</option>
                <option value="OTHER">Other reason</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#374151', marginBottom: '6px' }}>
                Internal Notes for Admin (Optional)
              </label>
              <textarea
                rows={3}
                value={failureNotes}
                onChange={(e) => setFailureNotes(e.target.value)}
                placeholder="Add any specific details for store admin..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="outline" size="sm" onClick={() => setIsFailureModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleConfirmFailure}>
                Submit Failure Report
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderDetailsPage;
