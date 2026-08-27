import React from 'react';
import { formatCurrency } from '../../utils/formatting';
import { ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const SearchSuggestions = ({ products = [], onSelectProduct }) => {
  if (!products || products.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Product Suggestions ({products.length})
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {products.map(product => {
          const isOutOfStock = product.stockStatus === 'OUT_OF_STOCK' || product.isAvailable === false;
          const unitStr = (product.unitValue || product.unit) ? ` · ${product.unitValue || ''} ${product.unit || ''}` : '';

          return (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease'
              }}
            >
              {/* Product Image Thumbnail */}
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'}
                  alt={product.name}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Product Info */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </span>
                
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {product.brand || 'Kirana'}{unitStr}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#047857' }}>
                    {formatCurrency(product.sellingPrice)}
                  </span>

                  {isOutOfStock ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                      <AlertCircle size={12} /> Out of Stock
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 700, color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                      <CheckCircle2 size={12} /> In Stock
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight size={18} color="#94A3B8" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
