import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const Breadcrumbs = ({ items = [] }) => {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
      <Link to="/" style={{ color: 'var(--color-text-secondary)' }}>Home</Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={14} />
          {item.to ? (
            <Link to={item.to} style={{ color: 'var(--color-text-secondary)' }}>{item.label}</Link>
          ) : (
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
