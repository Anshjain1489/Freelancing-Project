import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showSuccess, showError } from '../../utils/toast';
import { ArrowLeft, Save, UploadCloud, X, Image as ImageIcon } from 'lucide-react';

export const ProductFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    brand: 'Chaudhary Kirana',
    imageUrl: '',
    mrp: '',
    sellingPrice: '',
    unit: 'kg',
    unitValue: 1,
    description: '',
    stockQuantity: 50,
    lowStockThreshold: 5,
    isActive: true
  });
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, imageUrl: event.target.result }));
      showSuccess('Product photo uploaded successfully! 📸');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mrp || !formData.sellingPrice) {
      showError('Please fill in required product fields');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await adminService.updateProduct(id, formData);
        showSuccess('Product updated successfully!');
      } else {
        await adminService.createProduct(formData);
        showSuccess('Product added to Kirana store catalog!');
      }
      navigate('/admin/products');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/admin/products')}>
          Back
        </Button>
        <h1 className="text-h1">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
      </div>

      <Card padding="28px">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Product Name"
            placeholder="e.g. Aashirvaad Shuddh Chakki Atta 5kg"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          {/* Product Image Upload Component */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Product Image (Upload Photo or Enter URL)
            </label>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* File Upload Box */}
              <label
                htmlFor="product-image-file"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-mint-light)',
                  border: '1.5px dashed var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--color-primary-dark)'
                }}
              >
                <UploadCloud size={18} />
                <span>Upload Photo from Device</span>
                <input
                  id="product-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>

              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>OR</span>

              {/* Direct Image URL input */}
              <div style={{ flex: 1, minWidth: '220px' }}>
                <Input
                  placeholder="Paste Image URL (e.g. https://...)"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Live Image Preview */}
            {formData.imageUrl && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: '#F9FAFB'
              }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff', flexShrink: 0 }}>
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block' }}>
                    📸 Image Attached
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Will be displayed in product catalog and cart
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => setFormData({ ...formData, imageUrl: '' })}
                  style={{ color: 'var(--color-error)' }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Brand"
              placeholder="e.g. Aashirvaad, Fortune, Amul"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
            <Input
              label="Unit (kg/g/litre/ml/pack)"
              placeholder="e.g. kg or 500g"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="MRP Price (₹)"
              type="number"
              placeholder="250"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || '' })}
              required
            />
            <Input
              label="Selling Price (₹)"
              type="number"
              placeholder="235"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || '' })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Initial Stock Quantity"
              type="number"
              value={formData.stockQuantity}
              onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
            />
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 5 })}
            />
          </div>

          <Button variant="primary" type="submit" loading={loading} icon={Save} fullWidth style={{ marginTop: '12px' }}>
            {isEdit ? 'Update Product' : 'Save Product to Catalog'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
