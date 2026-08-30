import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { Tag, Plus, Edit2, Trash2, Power, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';

export const CouponManagementPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minimumOrderAmount: '',
    maximumDiscountAmount: '',
    usageLimit: '',
    usageLimitPerUser: '',
    startsAt: '',
    expiresAt: '',
    isActive: true
  });

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminService.getCoupons();
      setCoupons(res.data?.items || res.items || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minimumOrderAmount: '500',
      maximumDiscountAmount: '100',
      usageLimit: '100',
      usageLimitPerUser: '1',
      startsAt: new Date().toISOString().slice(0, 16),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      isActive: true
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (cpn) => {
    setEditingCoupon(cpn);
    setFormData({
      code: cpn.code || '',
      description: cpn.description || '',
      discountType: cpn.discountType || cpn.discount_type || 'FIXED',
      discountValue: String(cpn.discountValue ?? cpn.discount_value ?? ''),
      minimumOrderAmount: String(cpn.minimumOrderAmount ?? cpn.minimum_order_amount ?? ''),
      maximumDiscountAmount: String(cpn.maximumDiscountAmount ?? cpn.maximum_discount_amount ?? ''),
      usageLimit: String(cpn.usageLimit ?? cpn.usage_limit ?? ''),
      usageLimitPerUser: String(cpn.usageLimitPerUser ?? cpn.usage_limit_per_user ?? ''),
      startsAt: cpn.startsAt ? new Date(cpn.startsAt).toISOString().slice(0, 16) : '',
      expiresAt: cpn.expiresAt ? new Date(cpn.expiresAt).toISOString().slice(0, 16) : '',
      isActive: cpn.isActive ?? cpn.is_active ?? true
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      description: formData.description,
      discountType: formData.discountType,
      discountValue: parseFloat(formData.discountValue),
      minimumOrderAmount: parseFloat(formData.minimumOrderAmount || 0),
      maximumDiscountAmount: formData.maximumDiscountAmount ? parseFloat(formData.maximumDiscountAmount) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser, 10) : null,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      isActive: formData.isActive
    };

    // Client-side Validation
    if (!payload.code) {
      setErrorMsg('Coupon code is required');
      setSaving(false);
      return;
    }
    if (isNaN(payload.discountValue) || payload.discountValue <= 0) {
      setErrorMsg('Discount value must be greater than 0');
      setSaving(false);
      return;
    }
    if (payload.discountType === 'PERCENTAGE' && payload.discountValue > 100) {
      setErrorMsg('Percentage discount cannot exceed 100%');
      setSaving(false);
      return;
    }

    try {
      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        setSuccessMsg(`Coupon "${payload.code}" updated successfully!`);
      } else {
        await adminService.createCoupon(payload);
        setSuccessMsg(`Coupon "${payload.code}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cpn) => {
    try {
      const nextStatus = !(cpn.isActive ?? cpn.is_active);
      await adminService.toggleCouponStatus(cpn.id, nextStatus);
      setSuccessMsg(`Coupon "${cpn.code}" ${nextStatus ? 'activated' : 'deactivated'}!`);
      fetchCoupons();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to toggle coupon status.');
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteConfirmation) return;
    try {
      const res = await adminService.deleteCoupon(deleteConfirmation.id);
      setSuccessMsg(res.message || `Coupon "${deleteConfirmation.code}" deleted.`);
      setDeleteConfirmation(null);
      fetchCoupons();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete coupon.');
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag color="#06C167" /> Coupon Management 🎟️
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Create discount rules, usage limits, percentage/fixed offers, and track redemptions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchCoupons}>Refresh</Button>
          <Button variant="primary" icon={Plus} onClick={openCreateModal}>+ Create Coupon</Button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={18} /> {successMsg}</span>
          <X size={16} style={{ cursor: 'pointer' }} onClick={() => setSuccessMsg('')} />
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #EF4444', color: '#B91C1C', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={18} /> {errorMsg}</span>
          <X size={16} style={{ cursor: 'pointer' }} onClick={() => setErrorMsg('')} />
        </div>
      )}

      {/* Search Bar & Table */}
      <Card padding="20px">
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '320px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            Total Coupons: <strong>{filteredCoupons.length}</strong>
          </span>
        </div>

        {loading ? (
          <TableRowSkeleton />
        ) : filteredCoupons.length === 0 ? (
          <div style={{ textAlignment: 'center', padding: '40px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            No coupons found. Click <strong>+ Create Coupon</strong> to add a new discount offer.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Discount</th>
                  <th style={{ padding: '10px' }}>Min Order</th>
                  <th style={{ padding: '10px' }}>Max Discount</th>
                  <th style={{ padding: '10px' }}>Usage (Used/Limit)</th>
                  <th style={{ padding: '10px' }}>Validity</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((c) => {
                  const isActive = c.isActive ?? c.is_active;
                  const discountType = c.discountType || c.discount_type;
                  const discountVal = c.discountValue ?? c.discount_value;
                  const minAmt = c.minimumOrderAmount ?? c.minimum_order_amount;
                  const maxDisc = c.maximumDiscountAmount ?? c.maximum_discount_amount;
                  const limit = c.usageLimit ?? c.usage_limit;
                  const used = c.usageCount ?? 0;

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: isActive ? 1 : 0.6 }}>
                      <td style={{ padding: '12px 10px', fontWeight: 800 }}>
                        <span style={{ background: '#ECFDF5', color: '#047857', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px border #10B981' }}>
                          {c.code}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{c.description}</div>
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {discountType === 'PERCENTAGE' ? `${discountVal}% OFF` : `₹${discountVal} OFF`}
                      </td>
                      <td style={{ padding: '12px 10px' }}>₹{minAmt || 0}</td>
                      <td style={{ padding: '12px 10px' }}>{maxDisc ? `₹${maxDisc}` : '—'}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <strong>{used}</strong> / {limit || '∞'}
                      </td>
                      <td style={{ padding: '12px 10px', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Always Valid'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {isActive ? <Badge variant="green">ACTIVE</Badge> : <Badge variant="red">INACTIVE</Badge>}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            title="Edit Coupon"
                            onClick={() => openEditModal(c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#3B82F6' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            title={isActive ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleStatus(c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isActive ? '#F59E0B' : '#10B981' }}
                          >
                            <Power size={16} />
                          </button>
                          <button
                            title="Delete Coupon"
                            onClick={() => setDeleteConfirmation(c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#EF4444' }}
                          >
                            <Trash2 size={16} />
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', width: '540px', maxWidth: '95%', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon 🎟️'}
              </h2>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)} />
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #EF4444', color: '#B91C1C', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '14px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAVE10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Discount Type *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Get 10% off on orders above ₹500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Value ({formData.discountType === 'PERCENTAGE' ? '%' : '₹'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="10"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Min Order (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="500"
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minimumOrderAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Max Discount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="100"
                    value={formData.maximumDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maximumDiscountAmount: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Usage Limit (Global)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Usage Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.usageLimitPerUser}
                    onChange={(e) => setFormData({ ...formData, usageLimitPerUser: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Expiry Date</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Coupon Active & Eligible for Customer Checkout
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#FFF', width: '420px', maxWidth: '95%', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px 0', color: '#EF4444' }}>
              Delete coupon {deleteConfirmation.code}?
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              This action cannot be undone. If this coupon has been used by historical orders, it will be safely deactivated to preserve financial order integrity.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirmation(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteCoupon}>Delete / Deactivate</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagementPage;
