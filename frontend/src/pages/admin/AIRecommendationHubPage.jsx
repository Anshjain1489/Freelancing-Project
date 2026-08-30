import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AIRecommendationHubPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/recommendations/queue');
      setRecommendations(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching recommendation queue", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActioningId(id);
    try {
      const res = await api.post(`/ai/recommendations/queue/${id}/approve`);
      if (res.data?.success) {
        alert(`Approved! Result: ${res.data.data.executionResult}`);
        fetchRecommendations();
      }
    } catch (err) {
      alert(`Approval Failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id) => {
    setActioningId(id);
    try {
      const res = await api.post(`/ai/recommendations/queue/${id}/reject`, { reason: 'Dismissed by admin' });
      if (res.data?.success) {
        fetchRecommendations();
      }
    } catch (err) {
      alert(`Dismissal Failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
            🎯 AI Action Recommendation Queue
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
            Non-blocking advisory queue. AI recommendations require explicit admin approval before invoking business execution.
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          style={{
            padding: '10px 18px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading AI recommendation queue...</div>
      ) : recommendations.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '40px', textAlign: 'center', color: '#64748B' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
          <p style={{ fontSize: '16px', fontWeight: '600' }}>No pending AI action recommendations.</p>
          <p style={{ fontSize: '14px' }}>All AI suggestions have been reviewed or store operations are fully optimized.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recommendations.map(rec => (
            <div
              key={rec.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1, paddingRight: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: rec.category === 'INVENTORY_REORDER' ? '#FEE2E2' : rec.category === 'PRICE_ADJUSTMENT' ? '#FEF3C7' : '#EEF2FF',
                    color: rec.category === 'INVENTORY_REORDER' ? '#991B1B' : rec.category === 'PRICE_ADJUSTMENT' ? '#92400E' : '#3730A3'
                  }}>
                    {rec.category}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>
                    Impact Score: {rec.impactScore}/100
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px 0' }}>
                  {rec.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                  {rec.description}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleReject(rec.id)}
                  disabled={actioningId === rec.id}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: actioningId === rec.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  Dismiss
                </button>
                <button
                  onClick={() => handleApprove(rec.id)}
                  disabled={actioningId === rec.id}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: actioningId === rec.id ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actioningId === rec.id ? 'Executing...' : '✓ Approve & Execute'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
