import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const SearchSkeleton = ({ count = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0'
          }}
        >
          <Skeleton width="56px" height="56px" borderRadius="10px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton width="70%" height="16px" />
            <Skeleton width="40%" height="14px" />
            <Skeleton width="30%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  );
};
