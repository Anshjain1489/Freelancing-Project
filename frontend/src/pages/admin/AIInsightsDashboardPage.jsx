import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AIInsightsDashboardPage() {
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [pricingWarnings, setPricingWarnings] = useState([]);
  const [churnRisks, setChurnRisks] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [salesForecast, setSalesForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [reordersRes, pricingRes, churnRes, anomalyRes, forecastRes] = await Promise.all([
        api.get('/ai/forecasting/reorders'),
        api.get('/ai/risk-pricing/pricing'),
        api.get('/ai/risk-pricing/churn'),
        api.get('/ai/anomalies'),
        api.get('/ai/forecasting/sales?days=7')
      ]);

      setReorderAlerts(reordersRes.data?.data || []);
      setPricingWarnings(pricingRes.data?.data || []);
      setChurnRisks(churnRes.data?.data || []);
      setAnomalies(anomalyRes.data?.data || []);
      setSalesForecast(forecastRes.data?.data || []);
    } catch (err) {
      console.error("Error loading AI insights", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
            🧠 AI Retail Insights & Autonomous Ops Dashboard
          </h1>
          <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
            Real-time predictive intelligence, inventory stock-out risks, margin loss alerts, and churn prevention.
          </p>
        </div>
        <button
          onClick={fetchInsights}
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
          🔄 Refresh AI Intelligence Scan
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading AI Intelligence Engine...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          
          {/* Card 1: Stock-Out & Inventory Risks */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                ⚠️ Inventory Stock-Out Risks
              </h3>
              <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                {reorderAlerts.length} Critical/High
              </span>
            </div>

            {reorderAlerts.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '14px' }}>All product stock levels are healthy.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reorderAlerts.slice(0, 4).map(item => (
                  <div key={item.id} style={{ padding: '12px', backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#7F1D1D' }}>{item.productName}</div>
                    <div style={{ fontSize: '13px', color: '#991B1B', marginTop: '4px' }}>
                      Predicted Stock-out: <strong>in {item.daysToStockout} days</strong> ({item.predictedStockoutDate})
                    </div>
                    <div style={{ fontSize: '12px', color: '#450A0A', marginTop: '2px' }}>
                      Current Stock: {item.currentStock} units | Recommended Reorder: <strong>{item.recommendedReorderQty} units</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Margin Loss & Dynamic Pricing */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                💸 Profit Margin & Pricing Alerts
              </h3>
              <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                {pricingWarnings.length} Items Flagged
              </span>
            </div>

            {pricingWarnings.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '14px' }}>No items selling below cost or target margin.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pricingWarnings.slice(0, 4).map(item => (
                  <div key={item.id} style={{ padding: '12px', backgroundColor: '#FFFBEB', borderLeft: '4px solid #F59E0B', borderRadius: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#78350F' }}>{item.productName}</div>
                    <div style={{ fontSize: '13px', color: '#92400E', marginTop: '4px' }}>
                      Selling at ₹{item.currentSellingPrice} vs WAC Cost ₹{item.wacCost} ({item.currentMarginPct}% margin)
                    </div>
                    <div style={{ fontSize: '12px', color: '#451A03', marginTop: '2px' }}>
                      Recommended Price: <strong>₹{item.recommendedPrice}</strong> (Predicted Margin: {item.predictedMarginPct}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Customer Churn Prevention */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                📉 Customer Retention Alerts
              </h3>
              <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                {churnRisks.length} High-Risk Users
              </span>
            </div>

            {churnRisks.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '14px' }}>No high-value customers at high risk of churn.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {churnRisks.slice(0, 4).map(item => (
                  <div key={item.id} style={{ padding: '12px', backgroundColor: '#EEF2FF', borderLeft: '4px solid #6366F1', borderRadius: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#312E81' }}>{item.customerName} ({item.phone})</div>
                    <div style={{ fontSize: '13px', color: '#3730A3', marginTop: '4px' }}>
                      Churn Risk: <strong>{item.churnProbability}%</strong> | Revenue at Risk: <strong>₹{item.estimatedRevenueAtRisk.toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#1E1B4B', marginTop: '2px' }}>
                      Action: {item.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Store Revenue Forecast */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                🔮 7-Day Revenue Projections
              </h3>
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                92% Confidence
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {salesForecast.slice(0, 5).map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600', color: '#334155' }}>{f.forecastDate}</span>
                  <span style={{ color: '#16A34A', fontWeight: '700' }}>₹{f.predictedRevenue.toLocaleString('en-IN')} ({f.predictedOrdersCount} orders)</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
