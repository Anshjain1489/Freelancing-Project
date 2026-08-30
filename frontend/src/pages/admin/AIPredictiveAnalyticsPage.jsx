import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AIPredictiveAnalyticsPage() {
  const [demandForecasts, setDemandForecasts] = useState([]);
  const [salesForecasts, setSalesForecasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [demandRes, salesRes] = await Promise.all([
        api.get('/ai/forecasting/demand?limit=30'),
        api.get('/ai/forecasting/sales?days=14')
      ]);

      setDemandForecasts(demandRes.data?.data || []);
      setSalesForecasts(salesRes.data?.data || []);
    } catch (err) {
      console.error("Error loading predictive analytics", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
          📈 Predictive Demand & Revenue Forecasting
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
          30-day item velocity predictions, day-of-week seasonality, and store revenue projection curves.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Calculating predictive forecasts...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Sales Revenue Projections */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
              🔮 14-Day Store Revenue Projections
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Forecast Date</th>
                    <th style={{ padding: '12px' }}>Predicted Revenue</th>
                    <th style={{ padding: '12px' }}>Lower Bound (-15%)</th>
                    <th style={{ padding: '12px' }}>Upper Bound (+20%)</th>
                    <th style={{ padding: '12px' }}>Est. Orders</th>
                    <th style={{ padding: '12px' }}>Confidence Score</th>
                  </tr>
                </thead>
                <tbody>
                  {salesForecasts.map(sf => (
                    <tr key={sf.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#0F172A' }}>{sf.forecastDate}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#16A34A' }}>₹{sf.predictedRevenue.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>₹{sf.lowerBound.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>₹{sf.upperBound.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{sf.predictedOrdersCount}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          {sf.confidencePct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Product Demand Forecasts */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
              📦 Product-Level Demand Forecasts & Velocity Trends
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Product Name</th>
                    <th style={{ padding: '12px' }}>Predicted Daily Demand</th>
                    <th style={{ padding: '12px' }}>Daily Range</th>
                    <th style={{ padding: '12px' }}>Trend Direction</th>
                    <th style={{ padding: '12px' }}>Seasonality Multiplier</th>
                    <th style={{ padding: '12px' }}>Confidence Score</th>
                  </tr>
                </thead>
                <tbody>
                  {demandForecasts.map(df => (
                    <tr key={df.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#0F172A' }}>{df.productName}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#2563EB' }}>{df.predictedDailyDemand} units/day</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{df.lowerBound} – {df.upperBound}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: df.trendDirection === 'UPWARD' ? '#DCFCE7' : '#F1F5F9',
                          color: df.trendDirection === 'UPWARD' ? '#166534' : '#475569'
                        }}>
                          {df.trendDirection}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#475569' }}>{df.seasonalityFactor}x</td>
                      <td style={{ padding: '12px' }}>{df.confidenceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
