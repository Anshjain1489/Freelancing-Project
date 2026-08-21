import React from 'react';
import { Play } from 'lucide-react';

export const VideoPromoCard = ({ title = 'Store Tour & Fresh Stock Update', videoUrl, posterUrl }) => {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        height: '180px',
        backgroundColor: '#1F2937',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <Play size={24} fill="#fff" />
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{title}</h4>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Chaudhary Kirana Store • Mahruni</span>
      </div>
    </div>
  );
};
