import React, { useEffect, useState } from 'react';
import { addressService } from '../../services/address.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import GoogleMapAddressPicker from '../../components/common/GoogleMapAddressPicker';
import { showSuccess, showError } from '../../utils/toast';
import { MapPin, Plus, Trash2, Truck } from 'lucide-react';

export const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [estimatedDeliveryCharge, setEstimatedDeliveryCharge] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await addressService.getAddresses();
      setAddresses(res.data?.addresses || res.addresses || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleMapLocationSelect = (selected) => {
    setLatitude(selected.latitude);
    setLongitude(selected.longitude);
    setDeliveryDistanceKm(selected.distanceKm);
    setEstimatedDeliveryCharge(selected.deliveryCharge);

    if (!addressLine1 && selected.addressText) {
      setAddressLine1(selected.addressText);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addressService.createAddress({
        recipientName,
        phone,
        addressLine1,
        addressLine2,
        landmark,
        city: 'Mahruni',
        state: 'Uttar Pradesh',
        postalCode: '274702',
        latitude,
        longitude,
        deliveryDistanceKm,
        estimatedDeliveryCharge,
        isDefault: addresses.length === 0
      });
      showSuccess('Delivery address saved!');
      setIsModalOpen(false);
      // Reset form
      setRecipientName('');
      setPhone('');
      setAddressLine1('');
      setAddressLine2('');
      setLandmark('');
      setLatitude(null);
      setLongitude(null);
      setDeliveryDistanceKm(null);
      setEstimatedDeliveryCharge(null);
      fetchAddresses();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await addressService.deleteAddress(id);
      showSuccess('Address removed');
      fetchAddresses();
    } catch (err) {
      showError('Failed to remove address');
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'Saved Addresses' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Delivery Addresses 📍</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Manage delivery locations with Google Maps distance calculations
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Address
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {addresses.map(addr => (
          <Card key={addr.id} padding="20px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{addr.recipientName}</span>
                  {addr.isDefault && <Badge variant="green">DEFAULT</Badge>}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {addr.addressLine1}, {addr.addressLine2 && `${addr.addressLine2}, `}{addr.landmark && `Landmark: ${addr.landmark}, `}
                  {addr.city}, {addr.state} - {addr.postalCode}
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span>📞 Mobile: {addr.phone}</span>
                  {addr.deliveryDistanceKm !== null && addr.deliveryDistanceKm !== undefined && (
                    <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={14} /> {addr.deliveryDistanceKm} km (₹{addr.estimatedDeliveryCharge ?? Math.round(addr.deliveryDistanceKm * 10)})
                    </span>
                  )}
                </div>
              </div>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(addr.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Address Modal with Google Maps Location Picker */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Delivery Address">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Google Maps Location & Current Location Picker */}
          <GoogleMapAddressPicker
            onSelectAddress={handleMapLocationSelect}
            initialLat={latitude}
            initialLng={longitude}
          />

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <Input label="Recipient Name" value={recipientName} onChange={e => setRecipientName(e.target.value)} required />
            <Input label="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} required />
            <Input label="Address Line 1 (House/Street)" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} required />
            <Input label="Address Line 2 (Area/Colony)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
            <Input label="Landmark (Optional)" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="e.g. Near Bada Jain Mandir" />

            {deliveryDistanceKm !== null && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--color-mint-light)', border: '1px solid var(--color-primary)', fontSize: '0.85rem' }}>
                🚚 Delivery Distance: <strong>{deliveryDistanceKm} km</strong> • Delivery Charge: <strong style={{ color: 'var(--color-primary-dark)' }}>₹{estimatedDeliveryCharge}</strong>
              </div>
            )}

            <Button variant="primary" type="submit" loading={submitting} style={{ marginTop: '8px' }}>
              Save Address
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
};
