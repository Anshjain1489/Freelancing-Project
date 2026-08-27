import React from 'react';
import { POPULAR_SEARCH_CHIPS } from '../../hooks/useProductSearch';

export const PopularSearches = ({ onSelectChip }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Popular Searches 📈
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {POPULAR_SEARCH_CHIPS.map(chip => (
          <button
            key={chip.query}
            type="button"
            onClick={() => onSelectChip(chip.query)}
            style={{
              minHeight: '44px',
              padding: '8px 14px',
              borderRadius: '22px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F8FAFC',
              color: '#1E293B',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
