import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService } from '../../services/category.service';
import { CategorySkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';

import { getCategoryImage } from '../../utils/categoryImages';

export const CategoryList = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.getCategories();
      setCategories(res.data?.categories || []);
    } catch (err) {
      setError('Failed to load grocery categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'Categories' }]} />

      <div>
        <h1 className="text-h1">All Grocery Categories 🗂</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Explore fresh pulses, daily ration, mustard oil, ghee, spices, beverages, and personal care.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <CategorySkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCategories} />
      ) : categories.length === 0 ? (
        <EmptyState title="No categories found" description="Store categories will appear here shortly." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              onClick={() => navigate(`/products?category=${cat.slug}`)}
              style={{
                padding: '20px 14px',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              className="animate-fadeIn"
            >
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                margin: '0 auto 12px auto',
                border: '2px solid var(--color-mint)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                backgroundColor: '#F8F9FA'
              }}>
                <img
                  src={getCategoryImage(cat)}
                  alt={cat.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{cat.name}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                {cat.description || 'Fresh Stock Available'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
