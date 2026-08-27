import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../../services/product.service';
import { ProductGrid } from '../../components/product/ProductGrid';
import { ProductQuickView } from '../../components/product/ProductQuickView';
import { Input } from '../../components/ui/Input';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Search } from 'lucide-react';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productService.searchProducts(query.trim());
        setProducts(res.data?.products || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val) {
      setSearchParams({ q: val });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchParams({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Search' }]} />

      <div>
        <h1 className="text-h1">Search Products 🔎</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Search by item name, brand, or category (e.g. Atta, Oil, Basmati, Amul, Salt)
        </p>
      </div>

      <div style={{ maxWidth: '600px', position: 'relative' }}>
        <Input
          icon={Search}
          placeholder="Type to search daily Kirana items..."
          value={query}
          onChange={handleInputChange}
          autoFocus
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#E2E8F0',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.8rem',
              color: '#475569'
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div>
        {query.length > 0 && query.length < 2 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Please type at least 2 characters to search...
          </p>
        ) : (
          <ProductGrid
            products={products}
            loading={loading}
            onQuickView={(p) => setQuickViewProduct(p)}
          />
        )}
      </div>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
