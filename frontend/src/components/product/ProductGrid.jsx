import React from 'react';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export const ProductGrid = ({ products = [], loading = false, onQuickView }) => {
  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {[1, 2, 3, 4, 5, 6].map(i => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try adjusting your category filter or search query." />;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '16px'
    }}>
      {products.map(p => (
        <ProductCard key={p.id} product={p} onQuickView={onQuickView} />
      ))}
    </div>
  );
};
