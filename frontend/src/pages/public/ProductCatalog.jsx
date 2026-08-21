import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../../services/product.service';
import { categoryService } from '../../services/category.service';
import { ProductGrid } from '../../components/product/ProductGrid';
import { ProductQuickView } from '../../components/product/ProductQuickView';
import { Pagination } from '../../components/ui/Pagination';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Drawer } from '../../components/ui/Drawer';
import { Filter, SlidersHorizontal, RotateCcw } from 'lucide-react';

export const ProductCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Load Categories list
  useEffect(() => {
    categoryService.getCategories().then(res => setCategories(res.data?.categories || [])).catch(() => {});
  }, []);

  // Fetch Products whenever query params change
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const res = await productService.getProducts({
          page: currentPage,
          limit: 12,
          category: currentCategory,
          search: currentSearch,
          sort: currentSort,
          minPrice: currentMinPrice,
          maxPrice: currentMaxPrice
        });
        setProducts(res.data?.items || []);
        setPagination(res.data?.pagination || { page: 1, totalPages: 1 });
      } catch (err) {
        console.error('Failed to fetch products catalog:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [currentCategory, currentSearch, currentSort, currentPage, currentMinPrice, currentMaxPrice]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(params);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  const filterControls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Categories</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => updateParam('category', '')}
            style={{
              textAlign: 'left',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: !currentCategory ? 'var(--color-mint)' : 'transparent',
              color: !currentCategory ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
              fontWeight: !currentCategory ? 800 : 500,
              fontSize: '0.85rem'
            }}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => updateParam('category', c.slug)}
              style={{
                textAlign: 'left',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: currentCategory === c.slug ? 'var(--color-mint)' : 'transparent',
                color: currentCategory === c.slug ? 'var(--color-primary-dark)' : 'var(--color-text-primary)',
                fontWeight: currentCategory === c.slug ? 800 : 500,
                fontSize: '0.85rem'
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Price Range (₹)</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Input placeholder="Min" value={currentMinPrice} onChange={e => updateParam('minPrice', e.target.value)} />
          <Input placeholder="Max" value={currentMaxPrice} onChange={e => updateParam('maxPrice', e.target.value)} />
        </div>
      </div>

      <Button variant="outline" size="sm" icon={RotateCcw} onClick={resetFilters}>
        Reset Filters
      </Button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Catalog' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Grocery Catalog 🛒</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            Showing items {currentCategory && `in "${categories.find(c=>c.slug===currentCategory)?.name || currentCategory}"`}
          </span>
        </div>

        {/* Sorting & Filter Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Select
            value={currentSort}
            onChange={(e) => updateParam('sort', e.target.value)}
            options={[
              { value: 'newest', label: 'Sort by: Newest' },
              { value: 'price_asc', label: 'Price: Low to High' },
              { value: 'price_desc', label: 'Price: High to Low' },
              { value: 'name_asc', label: 'Name: A to Z' }
            ]}
          />

          {/* Mobile Filter Button */}
          <div className="mobile-only">
            <Button variant="outline" icon={Filter} onClick={() => setIsFilterDrawerOpen(true)}>
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Desktop Sidebar Filters */}
          <aside className="desktop-only" style={{ width: '240px', flexShrink: 0, padding: '20px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            {filterControls}
          </aside>

          {/* Main Product Grid */}
          <div style={{ flex: 1 }}>
            <ProductGrid
              products={products}
              loading={loading}
              onQuickView={(p) => setQuickViewProduct(p)}
            />

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => {
                const params = new URLSearchParams(searchParams);
                params.set('page', p.toString());
                setSearchParams(params);
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Filter */}
      <Drawer isOpen={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)} title="Filter Products">
        {filterControls}
      </Drawer>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
