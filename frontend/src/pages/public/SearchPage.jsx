import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProductSearch } from '../../hooks/useProductSearch';
import { ProductGrid } from '../../components/product/ProductGrid';
import { ProductQuickView } from '../../components/product/ProductQuickView';
import { PopularSearches } from '../../components/search/PopularSearches';
import { RecentSearches } from '../../components/search/RecentSearches';
import { SearchSkeleton } from '../../components/search/SearchSkeleton';
import { Input } from '../../components/ui/Input';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Search, Grid, X } from 'lucide-react';

export const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const {
    query,
    setQuery,
    results,
    loading,
    recentSearches,
    clearSearch,
    saveRecent,
    removeRecent,
    clearRecent,
    executeSearch
  } = useProductSearch(initialQuery, 20);

  const [quickViewProduct, setQuickViewProduct] = useState(null);

  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  }, [query, setSearchParams]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    clearSearch();
    setSearchParams({});
  };

  const handleSelectChipOrRecent = (qStr) => {
    executeSearch(qStr);
  };

  const isQueryTyped = query.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Search' }]} />

      <div>
        <h1 className="text-h1">Search Products 🔎</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Search by item name, brand, or category (e.g. Atta, Oil, Basmati, Amul, Salt)
        </p>
      </div>

      {/* Input Bar */}
      <div style={{ maxWidth: '600px', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Input
          icon={Search}
          placeholder="Type to search daily Kirana items..."
          value={query}
          onChange={handleInputChange}
          autoFocus
        />
        {isQueryTyped && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#E2E8F0',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results / Default State Container */}
      <div>
        {loading ? (
          <SearchSkeleton count={6} />
        ) : isQueryTyped ? (
          results.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '12px', fontWeight: 600 }}>
                Found {results.length} item(s) for "{query}"
              </div>
              <ProductGrid
                products={results}
                loading={false}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            </div>
          ) : (
            /* No Results Empty State */
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              border: '1px dashed #CBD5E1',
              maxWidth: '600px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem'
              }}>
                🔎
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                No products found
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
                We couldn't find any products matching <strong>"{query}"</strong>.
              </p>
              <button
                type="button"
                onClick={() => navigate('/categories')}
                style={{
                  marginTop: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: '#06C167',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Grid size={16} /> Browse Categories
              </button>
            </div>
          )
        ) : (
          /* Empty Input Default State */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
            <PopularSearches onSelectChip={handleSelectChipOrRecent} />
            <RecentSearches
              items={recentSearches}
              onSelectRecent={handleSelectChipOrRecent}
              onRemoveRecent={removeRecent}
              onClearAll={clearRecent}
            />
          </div>
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
