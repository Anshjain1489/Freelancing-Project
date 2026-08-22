import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressService } from '../../services/address.service';
import { checkoutService } from '../../services/checkout.service';
import { orderService } from '../../services/order.service';
import { couponService } from '../../services/coupon.service';
import { RazorpayCheckoutButton } from '../../components/payment/RazorpayCheckoutButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { MapPin, Plus, Truck, ShieldCheck, ShoppingBag, Tag, CheckCircle, XCircle } from 'lucide-react';

export const CheckoutPage = () => {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // 1. Fetch User Delivery Addresses & Available Coupons
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingAddresses(true);
      try {
        const [addrRes, cpnRes] = await Promise.allSettled([
          addressService.getAddresses(),
          couponService.getAvailableCoupons()
        ]);

        if (addrRes.status === 'fulfilled') {
          const list = addrRes.value.data?.addresses || [];
          setAddresses(list);
          const defaultAddr = list.find(a => a.isDefault) || list[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        }

        if (cpnRes.status === 'fulfilled') {
          setAvailableCoupons(cpnRes.value.data?.coupons || []);
        }
      } catch (err) {
        setError('Failed to load initial checkout details');
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchInitialData();
  }, []);

  // 2. Fetch Backend Checkout Preview whenever selected address or applied coupon changes
  const fetchPreview = async (addressId, codeToUse = null) => {
    if (!addressId) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const activeCode = codeToUse !== null ? codeToUse : (appliedCoupon?.code || null);
      const res = await checkoutService.getPreview(addressId, activeCode);
      setPreview(res.data || null);

      if (res.data?.coupon) {
        setAppliedCoupon(res.data.coupon);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate checkout preview.';
      setError(msg);
      // If coupon became invalid, clear it
      if (appliedCoupon && msg.includes('coupon')) {
        setAppliedCoupon(null);
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (selectedAddressId) {
      fetchPreview(selectedAddressId);
    }
  }, [selectedAddressId]);

  // Handle Apply Coupon
  const handleApplyCoupon = async (codeToApply = null) => {
    const code = String(codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      showError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const res = await couponService.validateCoupon(code, selectedAddressId);
      setAppliedCoupon(res.coupon);
      showSuccess(res.message || `Coupon "${code}" applied!`);

      // Refresh preview with new coupon
      await fetchPreview(selectedAddressId, code);

      // Refresh available coupons eligibility
      const availRes = await couponService.getAvailableCoupons();
      setAvailableCoupons(availRes.data?.coupons || []);
    } catch (err) {
      showError(err.response?.data?.message || `Coupon "${code}" is invalid or minimum order amount not met.`);
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle Remove Coupon
  const handleRemoveCoupon = async () => {
    setAppliedCoupon(null);
    setCouponInput('');
    showSuccess('Coupon removed');
    await fetchPreview(selectedAddressId, '');
  };

  // 3. Create Order & Get Razorpay Payload
  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      showError('Please select a delivery address');
      return;
    }

    setCreatingOrder(true);
    setError(null);
    try {
      const res = await orderService.createOrder(selectedAddressId, appliedCoupon?.code || null);
      setOrderDetails(res.data);
      showSuccess('Order created! Opening secure payment portal...');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order. Please check stock or cart.');
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loadingAddresses) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <Skeleton height="150px" borderRadius="12px" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <h1 className="text-h1">Checkout & Delivery 🛒</h1>

      {error && <ErrorState message={error} onRetry={() => navigate('/cart')} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* 1. Address Selection */}
        <Card padding="20px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>1. Delivery Address 📍</h3>
            <Button variant="outline" size="sm" icon={Plus} onClick={() => navigate('/addresses')}>
              Add Address
            </Button>
          </div>

          {addresses.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              No delivery address saved. Please add an address to continue.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {addresses.map(addr => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedAddressId === addr.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    backgroundColor: selectedAddressId === addr.id ? 'var(--color-mint-light)' : 'var(--color-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{addr.recipientName} ({addr.phone})</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}{addr.landmark && `Landmark: ${addr.landmark}, `}
                      {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                  </div>
                  {addr.isDefault && <Badge variant="green">DEFAULT</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 2. COUPON CODE SECTION */}
        <Card padding="20px" style={{ background: '#FAF9FE', border: '1px solid #E2D9F3' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#5A32A3' }}>
            <Tag size={18} /> 🎟️ Have a Coupon Code?
          </h3>

          {appliedCoupon ? (
            <div style={{ background: '#E8F7F0', border: '1.5px solid #06C167', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#06C167', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} /> Coupon "{appliedCoupon.code}" Applied 🎉
                </div>
                <div style={{ fontSize: '0.8rem', color: '#2C3E50', marginTop: '2px' }}>
                  {appliedCoupon.description} • <strong>Saved {formatCurrency(preview?.discountAmount || appliedCoupon.discountValue)}</strong>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={handleRemoveCoupon}>
                Remove Coupon
              </Button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder="Enter Coupon Code (e.g. SAVE50)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                />
                <Button
                  variant="secondary"
                  size="md"
                  loading={couponLoading}
                  onClick={() => handleApplyCoupon()}
                >
                  APPLY
                </Button>
              </div>

              {/* AVAILABLE COUPONS CARDS */}
              {availableCoupons.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Available Store Coupons:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {availableCoupons.map(cpn => (
                      <div
                        key={cpn.id}
                        style={{
                          background: cpn.isEligible ? '#FFFFFF' : '#F5F5F5',
                          border: `1px ${cpn.isEligible ? 'solid #06C167' : 'dashed #CCC'}`,
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          gap: '6px',
                          opacity: cpn.isEligible ? 1 : 0.75
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: '0.9rem', color: cpn.isEligible ? '#06C167' : '#666' }}>
                            {cpn.code}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#555' }}>
                            {cpn.description}
                          </div>
                        </div>

                        {cpn.isEligible ? (
                          <button
                            onClick={() => {
                              setCouponInput(cpn.code);
                              handleApplyCoupon(cpn.code);
                            }}
                            disabled={couponLoading}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#06C167',
                              color: '#FFF',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            Apply {cpn.code}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#E74C3C', fontWeight: 700 }}>
                            Add {formatCurrency(cpn.neededAmount)} more
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 3. Order Summary & Price Breakdown */}
        {loadingPreview ? (
          <Skeleton height="200px" borderRadius="12px" />
        ) : preview ? (
          <Card padding="24px" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>3. Order Summary & Price Breakdown</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {preview.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{item.name} x {item.quantity}</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(item.itemTotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal ({preview.itemCount} items)</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(preview.subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={16} color="var(--color-primary)" />
                  <span>Delivery Charge ({preview.delivery.distanceKm} KM)</span>
                </div>
                <span style={{ fontWeight: 700, color: preview.delivery.deliveryCharge === 0 ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                  {preview.delivery.deliveryCharge === 0 ? 'FREE (≤ 1 KM)' : formatCurrency(preview.delivery.deliveryCharge)}
                </span>
              </div>

              {/* Dynamic Coupon Discount Row */}
              {preview.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06C167', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={16} />
                    <span>Coupon Discount ({preview.coupon?.code || appliedCoupon?.code})</span>
                  </div>
                  <span>-{formatCurrency(preview.discountAmount)}</span>
                </div>
              )}

              <div style={{ borderTop: '1.5px dashed var(--color-primary)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Payable Amount</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  {formatCurrency(preview.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Button Actions */}
            <div style={{ marginTop: '24px' }}>
              {orderDetails ? (
                <RazorpayCheckoutButton orderDetails={orderDetails} />
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={creatingOrder}
                  icon={ShoppingBag}
                  onClick={handleProceedToPayment}
                >
                  Proceed to Payment ({formatCurrency(preview.totalAmount)})
                </Button>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
