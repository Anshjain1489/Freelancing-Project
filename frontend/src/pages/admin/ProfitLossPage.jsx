import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  PieChart,
  RefreshCw
} from 'lucide-react';

export const ProfitLossPage = () => {
  const [loading, setLoading] = useState(true);
  const [statementData, setStatementData] = useState(null);
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPnl = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/admin/finance/profit-loss?periodType=${periodType}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStatementData(data);
      }
    } catch (e) {
      console.error('Error fetching P&L statement:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnl();
  }, [periodType]);

  const handleCustomSearch = (e) => {
    e.preventDefault();
    setPeriodType('CUSTOM');
    fetchPnl();
  };

  const stmt = statementData?.statement || {};
  const channels = statementData?.paymentChannels || {};
  const meta = statementData?.costMetadata || {};
  const categories = statementData?.expenseCategories || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Profit & Loss Statement 📈
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Server-authoritative financial income statement powered by cost-at-sale WAC snapshots.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--color-surface)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          {['DAILY', 'WEEKLY', 'MONTHLY'].map(p => (
            <button
              key={p}
              onClick={() => { setPeriodType(p); setStartDate(''); setEndDate(''); }}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: periodType === p ? 'var(--color-primary)' : 'transparent',
                color: periodType === p ? '#fff' : 'var(--color-text-secondary)'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Income Statement Table */}
      <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'var(--color-text-primary)' }}>
              CHAUDHARY KIRANA STORE - STATEMENT OF PROFIT & LOSS
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Period: {statementData?.period?.startDate} to {statementData?.period?.endDate}
            </div>
          </div>

          <span style={{
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 800,
            backgroundColor: '#D1FAE5',
            color: '#065F46'
          }}>
            Cost Strategy: {meta.costStrategy || 'IMMUTABLE_WAC_SNAPSHOT'}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><RefreshCw className="animate-spin" size={24} /> Generating P&L...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Revenue Section */}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>REVENUE FROM OPERATIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Gross Sales (POS + Online Orders)</span>
                  <span style={{ fontWeight: 700 }}>₹{(stmt.grossSales || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#DC2626' }}>
                  <span>(-) Discounts Allowed</span>
                  <span>-₹{(stmt.discounts || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#DC2626' }}>
                  <span>(-) Customer Refunds & Returns</span>
                  <span>-₹{(stmt.refunds || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900, borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
                  <span>NET REVENUE / SALES</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>₹{(stmt.netSales || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* COGS Section */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#D97706', marginBottom: '8px' }}>COST OF GOODS SOLD (COGS)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span>Cost of Inventory Sold (WAC Cost-at-Sale Snapshots)</span>
                  <span style={{ fontWeight: 700, color: '#D97706' }}>-₹{(stmt.cogs || 0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, borderTop: '2px solid #10B981', paddingTop: '8px', marginTop: '4px', backgroundColor: '#F0FDF4', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <span>GROSS PROFIT (Gross Margin: {stmt.grossMarginPct || 0}%)</span>
                  <span style={{ color: '#047857' }}>₹{(stmt.grossProfit || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#DC2626', marginBottom: '8px' }}>OPERATING EXPENSES (APPROVED)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px' }}>
                {categories.map(c => (
                  <div key={c.categoryId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <span>{c.categoryName}</span>
                    <span>-₹{(c.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: '6px', color: '#DC2626' }}>
                  <span>Total Operating Expenses</span>
                  <span>-₹{(stmt.operatingExpenses || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Net Profit Final Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 900, borderTop: '3px double var(--color-border)', paddingTop: '14px', marginTop: '12px', backgroundColor: stmt.netProfit >= 0 ? '#F3E8FF' : '#FEF2F2', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
              <span>NET PROFIT (Net Margin: {stmt.netMarginPct || 0}%)</span>
              <span style={{ color: stmt.netProfit >= 0 ? '#6B21A8' : '#991B1B' }}>
                ₹{(stmt.netProfit || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
