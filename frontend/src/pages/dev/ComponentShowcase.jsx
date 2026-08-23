import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProductCard } from '../../components/product/ProductCard';
import { PromotionalBanner } from '../../components/promotion/PromotionalBanner';
import { CouponCard } from '../../components/promotion/CouponCard';
import { showSuccess, showError, showWarning, showInfo } from '../../utils/toast';
import { ShoppingBag, Search, Sparkles } from 'lucide-react';

export const ComponentShowcase = () => {
  const [qty, setQty] = useState(2);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isChecked, setIsChecked] = useState(true);

  const demoProduct = {
    id: 'demo-p1',
    name: 'Aashirvaad Shuddh Chakki Atta 5kg',
    brand: 'Aashirvaad',
    unit: 'kg',
    unitValue: 5,
    mrp: 260,
    sellingPrice: 235,
    stockStatus: 'IN_STOCK'
  };

  return (
    <div style={{ padding: '32px 16px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div>
        <span className="badge-orange">Internal Developer Tool</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '8px' }}>
          Chaudhary Kirana Store — Component Design Showcase 🎨
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Catalog of all shared primitives, UI states, design tokens, and product components.
        </p>
      </div>

      {/* Buttons */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>1. Buttons & Variants</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary Green</Button>
          <Button variant="secondary">Secondary Orange</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" icon={ShoppingBag}>With Icon</Button>
        </div>
      </Card>

      {/* Toasts */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>2. Toast Notifications</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" onClick={() => showSuccess('Added to cart 🛒')}>Success Toast</Button>
          <Button variant="secondary" size="sm" onClick={() => showWarning('Only 3 items left!')}>Warning Toast</Button>
          <Button variant="danger" size="sm" onClick={() => showError('Product out of stock!')}>Error Toast</Button>
          <Button variant="outline" size="sm" onClick={() => showInfo('Delivery free within 1 KM')}>Info Toast</Button>
        </div>
      </Card>

      {/* Inputs & Controls */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>3. Form Controls & Quantity Selector</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'center' }}>
          <Input label="Search Input" icon={Search} placeholder="Search groceries..." value={inputText} onChange={e => setInputText(e.target.value)} />
          <Select label="Category Select" options={[{ value: '1', label: 'Atta & Grains' }, { value: '2', label: 'Oil & Ghee' }]} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Quantity Selector</label>
            <QuantitySelector quantity={qty} onChange={setQty} />
          </div>
          <Checkbox label="I agree to terms" checked={isChecked} onChange={e => setIsChecked(e.target.checked)} />
        </div>
      </Card>

      {/* Badges & Statuses */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>4. Badges & Status Indicators</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant="orange">15% OFF</Badge>
          <Badge variant="green">FREE Delivery</Badge>
          <Badge variant="mint">Fresh Chakki</Badge>
          <StatusBadge status="IN_STOCK" />
          <StatusBadge status="LOW_STOCK" />
          <StatusBadge status="OUT_OF_STOCK" />
          <StatusBadge status="CONFIRMED" />
          <StatusBadge status="DELIVERED" />
        </div>
      </Card>

      {/* Product & Promo Components */}
      <Card padding="24px">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>5. Product Card & Coupon Card</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <ProductCard product={demoProduct} onQuickView={() => setIsModalOpen(true)} />
          <CouponCard code="SAVE50" description="Flat ₹50 OFF on orders above ₹2,000" />
        </div>
      </Card>

      {/* Banner Component */}
      <PromotionalBanner />

      {/* Empty & Error States */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <EmptyState title="Your cart is empty" description="Add daily Kirana items to get fast delivery." actionLabel="Browse Catalog" onAction={() => {}} />
        <ErrorState message="Could not connect to API server. Please retry." onRetry={() => showInfo('Retrying connection...')} />
      </div>

      {/* Modal Demo */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Component Modal Preview">
        <p style={{ color: 'var(--color-text-secondary)' }}>
          This is a reusable, accessible Modal popup supporting custom contents and backdrop blur.
        </p>
        <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setIsModalOpen(false)}>
          Close Modal
        </Button>
      </Modal>
    </div>
  );
};
