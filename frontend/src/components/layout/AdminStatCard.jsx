import React from 'react';
import { Card } from '../ui/Card';

export const AdminStatCard = ({ title, value, icon: Icon, changeText, color = 'var(--color-primary)' }) => {
  return (
    <Card padding="20px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{title}</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{value}</h3>
          {changeText && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '4px', display: 'block' }}>
              {changeText}
            </span>
          )}
        </div>
        {Icon && (
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-mint)',
            color: color
          }}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </Card>
  );
};
