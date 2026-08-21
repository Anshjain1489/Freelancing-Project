import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';

export const Search = () => {
  const [query, setQuery] = useState('');

  return (
    <div style={{ padding: '16px 0' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Search Groceries</h2>
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <SearchIcon size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type grocery item name (e.g. Atta, Mustard Oil, Salt)..."
          style={{
            width: '100%',
            padding: '12px 14px 12px 44px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            fontSize: '1rem'
          }}
        />
      </div>
      <div style={{ padding: '24px', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
        <span>Instant Debounced Search Placeholder (Phase 5 integration)</span>
      </div>
    </div>
  );
};
