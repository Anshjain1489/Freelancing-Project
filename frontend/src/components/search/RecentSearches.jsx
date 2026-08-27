import React from 'react';
import { Clock, X } from 'lucide-react';

export const RecentSearches = ({ items = [], onSelectRecent, onRemoveRecent, onClearAll }) => {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Recent Searches 🕘
        </span>
        <button
          type="button"
          onClick={onClearAll}
          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '4px' }}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((queryStr, idx) => (
          <div
            key={`${queryStr}-${idx}`}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              cursor: 'pointer'
            }}
            onClick={() => onSelectRecent(queryStr)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <Clock size={16} color="#64748B" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {queryStr}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Remove ${queryStr} from recent searches`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveRecent(queryStr);
              }}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                borderRadius: '50%'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
