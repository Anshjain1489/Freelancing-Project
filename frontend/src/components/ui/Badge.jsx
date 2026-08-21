import React from 'react';

export const Badge = ({ children, variant = 'orange', icon: Icon = null, style = {} }) => {
  const getClass = () => {
    switch (variant) {
      case 'green': return 'badge-green';
      case 'mint': return 'badge-mint';
      case 'gray': return 'badge-gray';
      case 'danger': return 'badge-danger';
      case 'orange': default: return 'badge-orange';
    }
  };

  return (
    <span className={`badge ${getClass()}`} style={style}>
      {Icon && <Icon size={12} />}
      <span>{children}</span>
    </span>
  );
};
