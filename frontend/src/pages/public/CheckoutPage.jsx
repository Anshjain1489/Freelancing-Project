import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addressService } from '../../services/address.service';
import { checkoutService } from '../../services/checkout.service';
import { orderService } from '../../services/order.service';
import { RazorpayCheckoutButton } from '../../components/payment/RazorpayCheckoutButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { MapPin, Plus, Truck, ShieldCheck, ShoppingBag } from 'lucide-react';

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

  // 1. Fetch User Delivery Addresses
  useEffect(() => {
    const fetchAddr = async () => {
      setLoadingAddresses(true);
      try {
        const res = await addressService.getAddresses();
        const list = res.data?.addresses || [];
        setAddresses(list);
        const defaultAddr = list.find(a => a.isDefault) || list[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (err) {
        setError('Failed to load saved addresses');
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddr();
  }, []);

  // 2. Fetch Backend Checkout Preview whenever selected address changes
  useEffect(() => {
    if (!selectedAddressId) return;

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setError(null);
      try {
        const res = await checkoutService.getPreview(selectedAddressId);
        setPreview(res.data || null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate checkout preview.');
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [selectedAddressId]);

  // 3. Create Order & Get Razorpay Payload
  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      showError('Please select a delivery address');
      return;
    }

    setCreatingOrder(true);
    setError(null);
    try {
      const res = await orderService.createOrder(selectedAddressId);
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

        {/* 2. Order Summary & Backend Delivery Fee Calculation */}
        {loadingPreview ? (
          <Skeleton height="200px" borderRadius="12px" />
        ) : preview ? (
          <Card padding="24px" style={{ backgroundColor: 'var(--color-surface)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px' }}>2. Order Summary & Price Breakdown</h3>

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
