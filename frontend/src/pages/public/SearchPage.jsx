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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Search' }]} />

      <div>
        <h1 className="text-h1">Search Products 🔎</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Search by item name, brand, or category (e.g. Atta, Oil, Basmati, Amul, Salt)
        </p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <Input
          icon={Search}
          placeholder="Type to search daily Kirana items..."
          value={query}
          onChange={handleInputChange}
          autoFocus
        />
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
