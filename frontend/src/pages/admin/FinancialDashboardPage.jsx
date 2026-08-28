import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Wallet,
  AlertTriangle,
  FileText,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PlusCircle,
  Lock,
  CheckCircle,
  CreditCard,
  QrCode
} from 'lucide-react';

export const FinancialDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/finance/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (e) {
      console.error('Error fetching financial dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px auto' }} />
        <div>Loading Financial Position & Analytics...</div>
      </div>
    );
  }

  const today = dashboard?.todayPosition || {};
  const month = dashboard?.monthToDatePosition || {};
  const payables = dashboard?.supplierPayablesSummary || {};
  const cash = dashboard?.cashPosition || {};
  const alerts = dashboard?.alerts || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Financial Intelligence & Profitability 💰📊
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Real-time cash flow, WAC-based profit margin, operating expenses, and supplier payables control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/admin/expenses')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <Receipt size={16} /> Add Expense
          </button>
          <button
            onClick={() => navigate('/admin/cash-management')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <Wallet size={16} /> Daily Cash Register
          </button>
        </div>
      </div>

      {/* Financial Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {alerts.map(alt => (
            <div
              key={alt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: alt.severity === 'CRITICAL' ? '#FEF2F2' : alt.severity === 'HIGH' ? '#FFFBEB' : '#EFF6FF',
                borderLeft: `4px solid ${alt.severity === 'CRITICAL' ? '#EF4444' : alt.severity === 'HIGH' ? '#F59E0B' : '#3B82F6'}`,
                color: alt.severity === 'CRITICAL' ? '#991B1B' : alt.severity === 'HIGH' ? '#92400E' : '#1E40AF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={20} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{alt.title}</div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>{alt.message}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
                {alt.actionRequired}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TODAY'S REVENUE</span>
            <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-text-primary)', margin: '8px 0 4px 0' }}>
            ₹{(today.revenue || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} /> COGS: ₹{(today.cogs || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TODAY'S GROSS PROFIT</span>
            <TrendingUp size={18} style={{ color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10B981', margin: '8px 0 4px 0' }}>
            ₹{(today.grossProfit || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Gross Margin: {today.grossMarginPct || 0}%
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>MONTHLY OPERATING EXPENSES</span>
            <Receipt size={18} style={{ color: '#EF4444' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#EF4444', margin: '8px 0 4px 0' }}>
            ₹{(month.operatingExpenses || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Rent, Salary, Utilities, Logistics
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>MONTHLY NET PROFIT</span>
            <Wallet size={18} style={{ color: '#8B5CF6' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: month.netProfit >= 0 ? '#8B5CF6' : '#EF4444', margin: '8px 0 4px 0' }}>
            ₹{(month.netProfit || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Net Margin: {month.netMarginPct || 0}%
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Payment Methods Breakdown */}
        <div style={{ padding: '24px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} /> Today's Sales Channel Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-mint-light)' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💵 Cash Sales
              </span>
              <strong style={{ color: 'var(--color-primary-dark)' }}>₹{(today.paymentChannels?.cashSales || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#EFF6FF' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📱 UPI Direct Sales
              </span>
              <strong style={{ color: '#1E40AF' }}>₹{(today.paymentChannels?.upiSales || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#F3E8FF' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💳 Card Payments
              </span>
              <strong style={{ color: '#6B21A8' }}>₹{(today.paymentChannels?.cardSales || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FFF7ED' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛒 Online Customer Orders
              </span>
              <strong style={{ color: '#C2410C' }}>₹{(today.paymentChannels?.onlineSales || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Supplier Payables Summary */}
        <div style={{ padding: '24px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} /> Accounts Payable Status
            </h3>
            <button onClick={() => navigate('/admin/payables')} style={{ fontSize: '0.8rem', color: 'var(--color-primary-dark)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
              View All Payables &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 700 }}>TOTAL OUTSTANDING TO SUPPLIERS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#991B1B' }}>
                  ₹{(payables.totalOutstanding || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <Building2 size={28} style={{ color: '#EF4444' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
                <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 700 }}>OVERDUE AMOUNT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B45309' }}>
                  ₹{(payables.overdueAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>UPCOMING DUE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803D' }}>
                  ₹{(payables.upcomingDueAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Quick Access */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <button
          onClick={() => navigate('/admin/profit-loss')}
          style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}
        >
          <TrendingUp size={24} style={{ color: 'var(--color-primary)' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>P&L Statement &rarr;</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Server-authoritative income statement & WAC margin</div>
        </button>

        <button
          onClick={() => navigate('/admin/expenses')}
          style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}
        >
          <Receipt size={24} style={{ color: '#EF4444' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Expense Control &rarr;</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Auditable expense approvals, reversals & categories</div>
        </button>

        <button
          onClick={() => navigate('/admin/cash-management')}
          style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}
        >
          <Wallet size={24} style={{ color: '#10B981' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Cash Register Sessions &rarr;</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Daily drawer opening, closing & discrepancy notes</div>
        </button>

        <button
          onClick={() => navigate('/admin/payables')}
          style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease' }}
        >
          <Building2 size={24} style={{ color: '#F59E0B' }} />
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-text-primary)' }}>Supplier Accounts Payable &rarr;</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Track invoices, partial payments & supplier balances</div>
        </button>
      </div>
    </div>
  );
};
