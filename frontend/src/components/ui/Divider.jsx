import React from 'react';

export const Divider = ({ margin = '16px 0', style = {} }) => {
  return (
    <hr style={{
      border: 'none',
      borderTop: '1px solid var(--color-border)',
      margin,
      ...style
    }} />
  );
};
