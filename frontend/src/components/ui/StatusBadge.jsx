import React from 'react';
import { Badge } from './Badge';

export const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'IN_STOCK':
        return { label: 'In Stock', variant: 'green' };
      case 'LOW_STOCK':
        return { label: 'Low Stock', variant: 'orange' };
      case 'OUT_OF_STOCK':
        return { label: 'Out of Stock', variant: 'danger' };
      case 'CONFIRMED':
      case 'PAYMENT_VERIFIED':
      case 'DELIVERED':
      case 'PAID':
        return { label: status.replace('_', ' '), variant: 'green' };
      case 'PENDING':
      case 'PROCESSING':
      case 'OUT_FOR_DELIVERY':
        return { label: status.replace('_', ' '), variant: 'orange' };
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
      case 'FAILED':
        return { label: status.replace('_', ' '), variant: 'danger' };
      default:
        return { label: status || 'Unknown', variant: 'gray' };
    }
  };

  const config = getStatusConfig();
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
