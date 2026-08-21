import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatting';
import { showSuccess } from '../../utils/toast';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const ChatMessage = ({ msg }) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const isUser = msg.role === 'USER';

  const handleAddToCart = async (product) => {
    await addItem(product, 1);
    showSuccess(`Added ${product.name} to cart! 🛒`);
  };

  const handleActionClick = (action) => {
    if (action.target) {
      navigate(action.target);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '14px'
    }}>
      {/* Message Text Bubble */}
      <div style={{
        maxWidth: '85%',
        padding: '12px 16px',
        borderRadius: '16px',
        borderBottomRightRadius: isUser ? '4px' : '16px',
        borderBottomLeftRadius: isUser ? '16px' : '4px',
        backgroundColor: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
        color: isUser ? '#ffffff' : 'var(--color-text-primary)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        fontSize: '0.88rem',
        lineHeight: '1.45',
        whiteSpace: 'pre-wrap'
      }}>
        {msg.content}
      </div>

      {/* Product Recommendation Cards Carousel */}
      {msg.products && msg.products.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', maxWidth: '100%', marginTop: '10px', paddingBottom: '4px' }}>
          {msg.products.map(prod => (
            <div
              key={prod.id}
              style={{
                minWidth: '180px',
                width: '180px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{prod.brand || 'Kirana Essential'}</span>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', marginTop: '2px', lineHeight: '1.2' }}>{prod.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>{formatCurrency(prod.sellingPrice)}</span>
                  {prod.mrp > prod.sellingPrice && (
                    <span style={{ textDecoration: 'line-through', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatCurrency(prod.mrp)}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button
                  onClick={() => handleAddToCart(prod)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    gap: '4px',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <ShoppingBag size={12} /> Add
                </button>
                <button
                  onClick={() => navigate(`/products/${prod.slug}`)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structured Action Chips */}
      {msg.actions && msg.actions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {msg.actions.map((act, idx) => (
            <button
              key={idx}
              onClick={() => handleActionClick(act)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid var(--color-primary)',
                backgroundColor: 'var(--color-mint-light)',
                color: 'var(--color-primary-dark)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>{act.label}</span>
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
