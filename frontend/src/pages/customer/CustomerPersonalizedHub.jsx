import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CustomerPersonalizedHub() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/recommendations/products');
      setRecommendations(res.data?.data || []);
    } catch (err) {
      console.error("Failed to load customer personalized recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
          ✨ Smart Grocery Recommendations & Restock Hub
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
          Personalized product recommendations based on your shopping history and daily essentials.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Personalizing recommendations for you...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {recommendations.map(item => (
            <div
              key={item.id || item.productId}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {item.recommendationType ? item.recommendationType.replace(/_/g, ' ') : 'RECOMMENDED'}
                </span>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0F172A', margin: '10px 0 6px 0' }}>
                  {item.name}
                </h3>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#16A34A' }}>
                    ₹{item.sellingPrice}
                  </span>
                  {item.mrp > item.sellingPrice && (
                    <span style={{ fontSize: '12px', color: '#94A3B8', textDecoration: 'line-through', marginLeft: '6px' }}>
                      ₹{item.mrp}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => alert(`Added ${item.name} to cart!`)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
