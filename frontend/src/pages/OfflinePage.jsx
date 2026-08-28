import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflinePage = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      backgroundColor: '#F9FAFB'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#FEE2E2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <WifiOff size={40} color="#DC2626" />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1F2937', marginBottom: '8px' }}>
        You are currently offline
      </h1>

      <p style={{ fontSize: '1rem', color: '#6B7280', maxWidth: '420px', marginBottom: '24px', lineHeight: 1.5 }}>
        Please check your internet connection. Stale financial or stock data is concealed for security while offline.
      </p>

      <button
        onClick={handleReload}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: '#06C167',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(6, 193, 103, 0.3)'
        }}
      >
        <RefreshCw size={18} />
        <span>Check Connection & Retry</span>
      </button>
    </div>
  );
};

export default OfflinePage;
