import React from 'react';

export const Tabs = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: isActive ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
              borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
