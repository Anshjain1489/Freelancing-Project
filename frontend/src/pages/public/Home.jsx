import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../../components/seo/SEO';
import { getLocalBusinessSchema } from '../../components/seo/structuredData';
import { PromotionalBanner } from '../../components/promotion/PromotionalBanner';
import { CouponCard } from '../../components/promotion/CouponCard';
import { ProductGrid } from '../../components/product/ProductGrid';
import { ProductQuickView } from '../../components/product/ProductQuickView';
import { CategorySkeleton } from '../../components/ui/Skeleton';
import { categoryService } from '../../services/category.service';
import { productService } from '../../services/product.service';
import { ShoppingBag, Phone, MapPin, Truck, ShieldCheck, ArrowRight } from 'lucide-react';

export const Home = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await categoryService.getCategories();
        setCategories(catRes.data?.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoadingCategories(false);
      }

      try {
        const prodRes = await productService.getFeaturedProducts();
        setFeaturedProducts(prodRes.data?.products || []);
      } catch (err) {
        console.error('Failed to load featured products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '32px' }}>
      <SEO
        title="Online Grocery Delivery in Mahruni"
        description="Shop daily groceries, flour, cooking oils, snacks, and household essentials online from Chaudhary Kirana Store in Mahruni with fast local delivery."
        jsonLd={getLocalBusinessSchema()}
      />

      {/* 1. Hero Section */}
      <section style={{
        backgroundColor: 'var(--color-mint-light)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 24px',
        border: '1px solid var(--color-primary-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="badge-green">🟢 FREE Delivery within 1 KM</span>
          <span className="badge-orange">🛵 ₹10/extra KM</span>
        </div>
        <h1 className="text-display" style={{ color: 'var(--color-text-primary)' }}>
          Online Grocery Delivery in Mahruni 🚀
        </h1>
        <p className="text-body-lg" style={{ color: 'var(--color-text-secondary)', maxWidth: '600px' }}>
          Fresh daily essential grocery items from Chaudhary Kirana Store. Fair prices, authentic quality, delivered directly to your home in Mahruni.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <button
            onClick={() => navigate('/products')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShoppingBag size={18} /> Shop Now
          </button>
          <button
            onClick={() => navigate('/categories')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: 'var(--color-primary-dark)',
              border: '1.5px solid var(--color-primary)',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)'
            }}
          >
            Browse Categories
          </button>
        </div>
      </section>

      {/* 2. Quick Categories Grid */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="text-h2">Quick Grocery Categories</h2>
          <button onClick={() => navigate('/categories')} style={{ color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ArrowRight size={16} />
          </button>
        </div>

        {loadingCategories ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => <CategorySkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
            {categories.slice(0, 8).map(cat => (
              <div
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                style={{
                  padding: '16px 12px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🌾</div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{cat.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Promotional Banner & Coupon */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <PromotionalBanner onCtaClick={() => navigate('/products')} />
        <CouponCard code="MAHRUNI50" description="Flat ₹50 OFF on monthly ration above ₹999" />
      </section>

      {/* 4. Featured Products Section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="text-h2">Featured Grocery Products 🔥</h2>
          <button onClick={() => navigate('/products')} style={{ color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View Catalog <ArrowRight size={16} />
          </button>
        </div>

        <ProductGrid
          products={featuredProducts}
          loading={loadingProducts}
          onQuickView={(p) => setQuickViewProduct(p)}
        />
      </section>

      {/* 5. Store Trust & Information Section */}
      <section style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        border: '1px solid var(--color-border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-dark)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Trusted Local Kirana</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Owned by Akash Chaudhary in Mahruni.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-dark)' }}>
            <Truck size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Free Local Delivery</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Free within 1 KM. Delivery up to 15 KM radius.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-dark)' }}>
            <MapPin size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Store Location</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Near Bada Jain Mandir, Tikamgarh Road, Mahruni</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-dark)' }}>
            <Phone size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Direct Call Order</h4>
            <a href="tel:7897837095" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
              📞 7897837095
            </a>
          </div>
        </div>
      </section>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
