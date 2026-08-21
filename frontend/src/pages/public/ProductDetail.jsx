import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SEO } from '../../components/seo/SEO';
import { getProductSchema } from '../../components/seo/structuredData';
import { productService } from '../../services/product.service';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { QuantitySelector } from '../../components/ui/QuantitySelector';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, calculateDiscountPercentage } from '../../utils/formatting';
import { useCart } from '../../hooks/useCart';
import { showSuccess } from '../../utils/toast';
import { ShoppingBag, Truck, ShieldCheck } from 'lucide-react';

export const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { cartItems, addItem, updateQuantity } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await productService.getProductBySlug(slug);
        setProduct(res.data?.product || null);
      } catch (err) {
        setError('Product details could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="300px" borderRadius="16px" />
        <Skeleton width="60%" height="28px" />
        <Skeleton width="40%" height="20px" />
      </div>
    );
  }

  if (error || !product) {
    return <ErrorState message={error || 'Product not found.'} onRetry={() => navigate('/products')} />;
  }

  const cartItem = cartItems.find(item => item.id === product.id || item.productId === product.id);
  const currentQty = cartItem ? cartItem.quantity : 0;
  const discount = calculateDiscountPercentage(product.mrp, product.sellingPrice);

  const handleAddToCart = () => {
    addItem(product, 1);
    showSuccess(`Added ${product.name} to cart 🛒`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title={`${product.name} | Buy Online in Mahruni`}
        description={`Buy ${product.name} (${product.brand || 'Kirana'}) online from Chaudhary Kirana Store. Selling Price ${formatCurrency(product.sellingPrice)}. Fast local delivery in Mahruni.`}
        jsonLd={getProductSchema(product)}
      />

      <Breadcrumbs items={[{ label: 'Catalog', to: '/products' }, { label: product.name }]} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '32px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        border: '1px solid var(--color-border)'
      }}>
        {/* Product Image Gallery */}
        <div style={{
          backgroundColor: 'var(--color-mint-light)',
          borderRadius: 'var(--radius-lg)',
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: '4rem',
          position: 'relative'
        }}>
          {discount > 0 && (
            <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
              <Badge variant="orange">{discount}% OFF</Badge>
            </div>
          )}
          🌾
        </div>

        {/* Product Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                {product.category?.name || 'Kirana'}
              </span>
              <StatusBadge status={product.stockStatus || 'IN_STOCK'} />
            </div>
            <h1 className="text-h1">{product.name}</h1>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Brand: {product.brand || 'Kirana'} • Package: {product.unitValue} {product.unit}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              {formatCurrency(product.sellingPrice)}
            </span>
            {product.mrp > product.sellingPrice && (
              <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                {formatCurrency(product.mrp)}
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {product.description || product.shortDescription || 'Fresh, high-grade daily Kirana essential sourced from verified suppliers.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
            {currentQty > 0 ? (
              <QuantitySelector
                quantity={currentQty}
                onChange={(q) => updateQuantity(product.id, q)}
                size="md"
              />
            ) : (
              <Button variant="primary" size="lg" icon={ShoppingBag} onClick={handleAddToCart}>
                Add to Cart 🛒
              </Button>
            )}
          </div>

          {/* Delivery Promise */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="var(--color-primary)" />
              <span>🟢 FREE Local Delivery within 1 KM radius</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--color-primary)" />
              <span>Verified Store Quality Guarantee by Akash Chaudhary</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
