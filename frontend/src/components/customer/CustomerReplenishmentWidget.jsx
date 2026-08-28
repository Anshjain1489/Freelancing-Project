import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { ShoppingCart, RefreshCw, X, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';

export const CustomerReplenishmentWidget = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReplenishments = async () => {
      try {
        const res = await apiClient.get('/customer/replenishment-recommendations');
        setRecommendations(res.data?.data?.recommendations || []);
      } catch (err) {
        // Silent catch if guest user or error
      } finally {
        setLoading(false);
      }
    };

    fetchReplenishments();
  }, []);

  const handleDismiss = async (id) => {
    try {
      await apiClient.post(`/customer/replenishment-recommendations/${id}/dismiss`);
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to dismiss replenishment:', err);
    }
  };

  if (loading || recommendations.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#ECFDF5', border: '2px solid #A7F3D0', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <RefreshCw size={20} color="#047857" />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#047857' }}>
          🛒 Smart Grocery Replenishment Reminders
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recommendations.map(rec => (
          <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                Running low on {rec.product_name}?
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Based on your previous order cycle (~{rec.estimated_interval_days} days), you might need a refill soon.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDismiss(rec.id)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                title="Dismiss reminder"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
