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
import { ShoppingBag, Phone, MapPin, Truck, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { getCategoryImage } from '../../utils/categoryImages';

export const Home = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [selectedStoreImage, setSelectedStoreImage] = useState(null);

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
          <span className="badge-green">🛵 Fast Delivery ₹10/KM</span>
          <span style={{ backgroundColor: '#FFF5F5', color: '#9B2C2C', border: '1px solid #FEB2B2', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🚫 No Refund & Exchange Policy
          </span>
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

      {/* Highlighted Store Policy Notice */}
      <section style={{
        backgroundColor: '#FFF5F5',
        border: '1.5px solid #FEB2B2',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 4px 12px rgba(229, 62, 62, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#FED7D7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} color="#C53030" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#9B2C2C', margin: 0 }}>
                Notice: Strict No Refund & Exchange Policy
              </h3>
              <span style={{ backgroundColor: '#C53030', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                Important Policy
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#742A2A', marginTop: '4px', margin: '4px 0 0 0', lineHeight: '1.4' }}>
              Due to hygiene and food safety standards for fresh groceries and daily essentials, <strong>Chaudhary Kirana Store follows a strict NO REFUND and NO EXCHANGE policy</strong> after successful delivery. Please inspect all items upon arrival.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/refund-policy')}
          style={{
            padding: '10px 18px',
            backgroundColor: '#9B2C2C',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.82rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(155, 44, 44, 0.2)'
          }}
        >
          Read Policy →
        </button>
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
                  padding: '14px 10px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  margin: '0 auto 8px auto',
                  border: '2px solid var(--color-mint)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  backgroundColor: '#F8F9FA'
                }}>
                  <img
                    src={getCategoryImage(cat)}
                    alt={cat.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'block', lineHeight: '1.2' }}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Promotional Banner & Coupon */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <PromotionalBanner onCtaClick={() => navigate('/products')} />
        <CouponCard code="SAVE50" description="Flat ₹50 OFF on orders above ₹2,000" />
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

      {/* 5. Real Store Photo Showcase (Right After Featured Products) */}
      <section style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 24px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <MapPin size={16} /> Authentic Local Kirana Store
            </div>
            <h2 className="text-h2" style={{ margin: 0 }}>Visit Chaudhary Kirana Store Mahruni 🏬</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              Take a look inside our physical store! Fresh daily groceries, wide variety of pulses, dry fruits, spices & household personal care.
            </p>
          </div>
          <a
            href="https://maps.google.com/?q=Chaudhary+Kirana+Store+Mahruni"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px',
              backgroundColor: 'var(--color-mint)',
              color: 'var(--color-primary-dark)',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              border: '1px solid var(--color-primary-light)'
            }}
          >
            🗺️ Open Store on Maps
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}>
          {/* Card 1: Store Front & Grain Bins */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onClick={() => setSelectedStoreImage('/images/store/store-front.jpg')}
          >
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
              <img
                src="/images/store/store-front.jpg"
                alt="Chaudhary Kirana Store Front with Fresh Pulses and Grains"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                🌾 Fresh Grain Containers
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Fresh Grains & Pulses Counter
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Neatly stored fresh pulses, grains & fryums ready for daily weighing and home delivery.
              </p>
            </div>
          </div>

          {/* Card 2: Shelves & Packed Items */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onClick={() => setSelectedStoreImage('/images/store/store-shelves-spices.jpg')}
          >
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
              <img
                src="/images/store/store-shelves-spices.jpg"
                alt="Kirana Store Shelves stocked with spices and food packets"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                🌶️ Packed Spices & Ration
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Full Stock of Spices & Rations
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Complete inventory of branded packaged spices, snacks, flour, and daily essential grocery packets.
              </p>
            </div>
          </div>

          {/* Card 3: Cosmetics Showcase */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onClick={() => setSelectedStoreImage('/images/store/store-shelves-cosmetics.jpg')}
          >
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
              <img
                src="/images/store/store-shelves-cosmetics.jpg"
                alt="Glass Display Cabinet with Cosmetics, Soaps and Hair Oils"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                🧴 Personal Care & Cosmetics
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Personal Care & Household Showcase
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Original soaps, shampoos, hair oils, body sprays & cleaning essentials from top trusted brands.
              </p>
            </div>
          </div>

          {/* Card 4: Store Owner & Billing Counter */}
          <div
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            onClick={() => setSelectedStoreImage('/images/store/store-counter-owner.jpg')}
          >
            <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
              <img
                src="/images/store/store-counter-owner.jpg"
                alt="Chaudhary Kirana Store Billing Counter and Shop Owner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                🤝 Friendly Customer Billing
              </span>
            </div>
            <div style={{ padding: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--color-text-primary)' }}>
                Trusted Service & Billing Counter
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Quick billing, accurate weight, and friendly local service right here in Mahruni.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Store Trust & Information Section */}
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
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Fast Local Delivery</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Flat ₹10 per KM rate up to 15 KM radius.</p>
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

      {/* Store Photo Lightbox Preview Modal */}
      {selectedStoreImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setSelectedStoreImage(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '900px', width: '100%', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStoreImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700
              }}
            >
              <X size={24} /> Close
            </button>
            <img
              src={selectedStoreImage}
              alt="Chaudhary Kirana Store Photo"
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
