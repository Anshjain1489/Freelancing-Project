import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AIRiskIntelligencePage() {
  const [churnRisks, setChurnRisks] = useState([]);
  const [creditRisks, setCreditRisks] = useState([]);
  const [subInsights, setSubInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const [churnRes, creditRes, subRes] = await Promise.all([
        api.get('/ai/risk-pricing/churn'),
        api.get('/ai/risk-pricing/credit'),
        api.get('/ai/risk-pricing/subscriptions')
      ]);

      setChurnRisks(churnRes.data?.data || []);
      setCreditRisks(creditRes.data?.data || []);
      setSubInsights(subRes.data?.data || []);
    } catch (err) {
      console.error("Error loading risk intelligence data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
          🛡️ Store Risk Intelligence Console
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', margin: '4px 0 0 0' }}>
          Udhar store credit default prediction, churn velocity drop-off, and subscription cancellation alerts.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Evaluating store risk profiles...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Udhar Credit Default Risk */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
              💳 Udhar Credit Default Risk Assessment
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Customer Name</th>
                    <th style={{ padding: '12px' }}>Phone</th>
                    <th style={{ padding: '12px' }}>Outstanding Udhar</th>
                    <th style={{ padding: '12px' }}>Credit Limit</th>
                    <th style={{ padding: '12px' }}>Default Risk Score</th>
                    <th style={{ padding: '12px' }}>Repayment Delay</th>
                    <th style={{ padding: '12px' }}>Risk Rating</th>
                    <th style={{ padding: '12px' }}>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {creditRisks.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#0F172A' }}>{c.customerName}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{c.phone}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#DC2626' }}>₹{c.currentBalance.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>₹{c.creditLimit.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>{c.defaultRiskScore}%</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{c.repaymentDelayDays} days</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: c.riskRating === 'HIGH_RISK' ? '#FEE2E2' : '#FEF3C7',
                          color: c.riskRating === 'HIGH_RISK' ? '#991B1B' : '#92400E'
                        }}>
                          {c.riskRating}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#334155' }}>{c.actionAdvice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Churn Probability Matrix */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>
              📉 High-Value Churn Risk Matrix
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Customer Name</th>
                    <th style={{ padding: '12px' }}>Phone</th>
                    <th style={{ padding: '12px' }}>Churn Probability</th>
                    <th style={{ padding: '12px' }}>Risk Tier</th>
                    <th style={{ padding: '12px' }}>Est. Revenue at Risk</th>
                    <th style={{ padding: '12px' }}>Recommended Retention Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {churnRisks.map(cr => (
                    <tr key={cr.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#0F172A' }}>{cr.customerName}</td>
                      <td style={{ padding: '12px', color: '#64748B' }}>{cr.phone}</td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#4F46E5' }}>{cr.churnProbability}%</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: cr.riskTier === 'CRITICAL' ? '#FEE2E2' : '#EEF2FF',
                          color: cr.riskTier === 'CRITICAL' ? '#991B1B' : '#3730A3'
                        }}>
                          {cr.riskTier}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '700', color: '#DC2626' }}>₹{cr.estimatedRevenueAtRisk.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#334155' }}>{cr.recommendedAction}</td>
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
