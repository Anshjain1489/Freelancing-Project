import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess, showError } from '../../utils/toast';
import { Tag, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const CouponsAdminPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    minimumOrderAmount: '',
    discountValue: '',
    discountType: 'FIXED',
    isActive: true
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(ENDPOINTS.ADMIN.COUPONS);
      setCoupons(res.data?.data?.items || res.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        minimumOrderAmount: coupon.minimum_order_amount || coupon.minimumOrderAmount || '',
        discountValue: coupon.discount_value || coupon.discountValue || '',
        discountType: coupon.discount_type || coupon.discountType || 'FIXED',
        isActive: coupon.is_active ?? coupon.isActive ?? true
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        description: '',
        minimumOrderAmount: '1000',
        discountValue: '50',
        discountType: 'FIXED',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await apiClient.patch(ENDPOINTS.ADMIN.COUPON_BY_ID(editingCoupon.id), formData);
        showSuccess('Coupon updated successfully');
      } else {
        await apiClient.post(ENDPOINTS.ADMIN.COUPONS, formData);
        showSuccess('Coupon created successfully');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await apiClient.patch(ENDPOINTS.ADMIN.COUPON_BY_ID(coupon.id), {
        isActive: !(coupon.is_active ?? coupon.isActive)
      });
      showSuccess(`Coupon ${coupon.code} updated!`);
      fetchCoupons();
    } catch (err) {
      showError('Failed to update coupon status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await apiClient.delete(ENDPOINTS.ADMIN.COUPON_BY_ID(id));
      showSuccess('Coupon deleted successfully');
      fetchCoupons();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Coupon & Discount Rules 🎟️</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Manage promotional codes, minimum order value rules, and fixed/percentage discount offers
          </p>
        </div>
        <Button variant="primary" size="md" icon={Plus} onClick={() => handleOpenModal()}>
          Create Coupon
        </Button>
      </div>

      <Card padding="20px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Description</th>
                  <th style={{ padding: '10px' }}>Min. Order Threshold</th>
                  <th style={{ padding: '10px' }}>Discount Value</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const active = coupon.is_active ?? coupon.isActive;
                  const minAmt = coupon.minimum_order_amount ?? coupon.minimumOrderAmount;
                  const discVal = coupon.discount_value ?? coupon.discountValue;
                  const discType = coupon.discount_type ?? coupon.discountType;

                  return (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 900, color: '#06C167' }}>
                        {coupon.code}
                      </td>
                      <td style={{ padding: '12px 10px', color: '#555' }}>
                        {coupon.description}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                        {formatCurrency(minAmt)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#C0392B' }}>
                        {discType === 'PERCENTAGE' ? `${discVal}% OFF` : `-${formatCurrency(discVal)}`}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            background: active ? '#E8F7F0' : '#FFF5F5',
                            color: active ? '#06C167' : '#C0392B',
                            border: `1px solid ${active ? '#06C167' : '#E74C3C'}`
                          }}
                        >
                          {active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              background: '#FFF',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            {active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleOpenModal(coupon)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--color-border)',
                              background: '#FFF',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #E74C3C',
                              background: '#FFF5F5',
                              color: '#C0392B',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="24px" style={{ width: '90%', maxWidth: '440px', background: '#FFF' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800 }}>
              {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon Rule 🎟️'}
            </h3>

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Coupon Code (Uppercase)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE100"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontWeight: 700, textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. ₹100 OFF on orders above ₹3,000"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Min. Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderAmount: e.target.value }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Enable this coupon immediately
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Save Coupon</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
