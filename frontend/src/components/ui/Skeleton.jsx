import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style = {} }) => {
  return (
    <div
      className="animate-pulse"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E5E7EB',
        ...style
      }}
    />
  );
};

export const ProductCardSkeleton = () => (
  <div style={{ padding: '16px', backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <Skeleton height="140px" borderRadius="8px" />
    <Skeleton width="40%" height="16px" />
    <Skeleton width="80%" height="20px" />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
      <Skeleton width="30%" height="24px" />
      <Skeleton width="35%" height="32px" borderRadius="6px" />
    </div>
  </div>
);

export const CategorySkeleton = () => (
  <div style={{ padding: '16px 12px', backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
    <Skeleton width="48px" height="48px" borderRadius="50%" />
    <Skeleton width="70%" height="16px" />
  </div>
);

export const TableRowSkeleton = () => (
  <div style={{ display: 'flex', gap: '16px', padding: '12px', borderBottom: '1px solid #E5E7EB' }}>
    <Skeleton width="20%" height="20px" />
    <Skeleton width="40%" height="20px" />
    <Skeleton width="20%" height="20px" />
    <Skeleton width="15%" height="20px" />
  </div>
);
