import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { showSuccess, showError } from '../../utils/toast';
import { ArrowLeft, Save } from 'lucide-react';

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Input
              label="Product Image URL"
              placeholder="e.g. https://images.unsplash.com/photo-... or image link"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
            {formData.imageUrl && (
              <div style={{
                marginTop: '6px',
                height: '120px',
                width: '120px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                backgroundColor: '#F9FAFB'
              }}>
                <img
                  src={formData.imageUrl}
                  alt="Product preview"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
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
