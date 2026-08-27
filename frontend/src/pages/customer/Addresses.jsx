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
import { MapPin, Plus, Trash2, Edit2, Truck, Home, Briefcase, Tag } from 'lucide-react';

export const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  // Form State
  const [label, setLabel] = useState('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Mahruni');
  const [state, setState] = useState('Uttar Pradesh');
  const [postalCode, setPostalCode] = useState('274702');
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

  const openAddModal = () => {
    setEditingAddressId(null);
    setLabel('Home');
    setRecipientName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setLandmark('');
    setCity('Mahruni');
    setState('Uttar Pradesh');
    setPostalCode('274702');
    setLatitude(null);
    setLongitude(null);
    setDeliveryDistanceKm(null);
    setEstimatedDeliveryCharge(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr) => {
    setEditingAddressId(addr.id);
    setLabel(addr.label || 'Home');
    setRecipientName(addr.recipientName || addr.recipient_name || '');
    setPhone(addr.phone || '');
    setAddressLine1(addr.addressLine1 || addr.address_line1 || '');
    setAddressLine2(addr.addressLine2 || addr.address_line2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Mahruni');
    setState(addr.state || 'Uttar Pradesh');
    setPostalCode(addr.postalCode || addr.postal_code || '274702');
    setLatitude(addr.latitude ? parseFloat(addr.latitude) : null);
    setLongitude(addr.longitude ? parseFloat(addr.longitude) : null);
    setDeliveryDistanceKm(addr.deliveryDistanceKm ?? addr.delivery_distance_km ?? null);
    setEstimatedDeliveryCharge(addr.estimatedDeliveryCharge ?? addr.estimated_delivery_charge ?? null);
    setIsModalOpen(true);
  };

  const handleMapLocationSelect = (selected) => {
    setLatitude(selected.latitude);
    setLongitude(selected.longitude);
    setDeliveryDistanceKm(selected.distanceKm);
    setEstimatedDeliveryCharge(selected.deliveryCharge);
  };

  const handleFieldsAutoFilled = (geoData) => {
    if (geoData.addressLine1) setAddressLine1(geoData.addressLine1);
    if (geoData.addressLine2) setAddressLine2(geoData.addressLine2);
    if (geoData.landmark) setLandmark(geoData.landmark);
    if (geoData.city) setCity(geoData.city);
    if (geoData.state) setState(geoData.state);
    if (geoData.postalCode) setPostalCode(geoData.postalCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientName.trim() || !phone.trim() || !addressLine1.trim()) {
      showError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        label,
        recipientName,
        phone,
        addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        postalCode,
        latitude,
        longitude,
        deliveryDistanceKm,
        estimatedDeliveryCharge,
        isDefault: editingAddressId ? false : addresses.length === 0
      };

      if (editingAddressId) {
        await addressService.updateAddress(editingAddressId, payload);
        showSuccess('Delivery address updated!');
      } else {
        await addressService.createAddress(payload);
        showSuccess('Delivery address saved!');
      }

      setIsModalOpen(false);
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
    <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'Saved Addresses' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Delivery Addresses 📍</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Manage locations with Google Maps road distance delivery calculations
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          Add Address
        </Button>
      </div>

      {/* Address Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {addresses.map(addr => {
          const recName = addr.recipientName || addr.recipient_name;
          const line1 = addr.addressLine1 || addr.address_line1;
          const line2 = addr.addressLine2 || addr.address_line2;
          const pCode = addr.postalCode || addr.postal_code;
          const distKm = addr.deliveryDistanceKm ?? addr.delivery_distance_km;
          const fee = addr.estimatedDeliveryCharge ?? addr.estimated_delivery_charge;

          return (
            <Card key={addr.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{recName}</span>
                    <Badge variant="blue">{addr.label || 'Home'}</Badge>
                    {addr.isDefault && <Badge variant="green">DEFAULT</Badge>}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {line1}{line2 ? `, ${line2}` : ''}{addr.landmark ? `, Landmark: ${addr.landmark}` : ''}, {addr.city || 'Mahruni'}, {addr.state || 'Uttar Pradesh'} - {pCode || '274702'}
                  </p>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '8px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>📞 {addr.phone}</span>
                    {distKm !== null && distKm !== undefined && (
                      <span style={{ color: 'var(--color-primary-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Truck size={14} /> {distKm} km (Delivery Charge: ₹{fee ?? (distKm <= 0 ? 0 : Math.ceil(distKm) * 10)})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="outline" size="sm" icon={Edit2} onClick={() => openEditModal(addr)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(addr.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Address Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Map Location Picker */}
          <GoogleMapAddressPicker
            onSelectAddress={handleMapLocationSelect}
            onFieldsAutoFilled={handleFieldsAutoFilled}
            initialLat={latitude}
            initialLng={longitude}
          />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Address Label</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Home', 'Work', 'Other'].map(lbl => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLabel(lbl)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: label === lbl ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: label === lbl ? 'var(--color-mint-light)' : '#FFF',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Recipient Name *" value={recipientName} onChange={e => setRecipientName(e.target.value)} required />
            <Input label="Mobile Phone *" value={phone} onChange={e => setPhone(e.target.value)} required />
            <Input label="Address Line 1 (House/Street) *" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} required />
            <Input label="Address Line 2 (Area/Colony)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} />
            <Input label="Landmark (Optional)" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="e.g. Near Bada Jain Mandir" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <Input label="City" value={city} onChange={e => setCity(e.target.value)} required />
              <Input label="State" value={state} onChange={e => setState(e.target.value)} required />
              <Input label="Postal Code" value={postalCode} onChange={e => setPostalCode(e.target.value)} required />
            </div>

            <Button variant="primary" type="submit" loading={submitting} style={{ marginTop: '8px' }}>
              {editingAddressId ? 'Update Address' : 'Save Address'}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
};
