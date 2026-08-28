import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  Boxes,
  RefreshCw,
  Plus,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';

export const InventoryValuationPage = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [activeTab, setActiveTab] = useState('valuation'); // 'valuation', 'adjustments'
  
  // Modals
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('DAMAGE');
  const [adjNotes, setAdjNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [valRes, adjRes] = await Promise.all([
        adminService.getInventoryValuationReport(),
        adminService.getStockAdjustments()
      ]);

      setReport(valRes.data || null);
      setAdjustments(adjRes.data?.adjustments || []);
    } catch (err) {
      console.error('Failed to fetch valuation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdjustment = async () => {
    if (!adjProductId || !adjQty) {
      alert('Please fill in Product ID and Quantity Change');
      return;
    }
    setSubmitting(true);
    try {
      await adminService.createStockAdjustment({
        productId: adjProductId,
        quantityChange: parseInt(adjQty, 10),
        reason: adjReason,
        notes: adjNotes
      });
      alert('Stock adjustment logged successfully');
      setShowAdjModal(false);
      setAdjProductId('');
      setAdjQty('');
      setAdjNotes('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to log stock adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseAdjustment = async (adjId) => {
    if (!window.confirm(`Are you sure you want to log a compensating reversal for adjustment #${adjId}?`)) return;
    try {
      await adminService.reverseStockAdjustment(adjId, 'Manual reversal by admin');
      alert('Stock adjustment reversed successfully');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to reverse adjustment');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Skeleton height="100px" borderRadius="12px" />
        <Skeleton height="350px" borderRadius="12px" />
      </div>
    );
  }

  const summary = report?.summary || {};
  const products = report?.products || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Inventory Valuation & Audit' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Inventory Costing, Valuation & Gross Profit 💰📊
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px', fontSize: '0.88rem' }}>
            Weighted-Average Costing (WAC) source of truth, profit margins, and immutable stock audit adjustments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowAdjModal(true)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#06C167', color: '#FFF', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New Stock Adjustment
          </button>
          <button
            type="button"
            onClick={fetchData}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL INVENTORY VALUATION</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
            {formatCurrency(summary.totalInventoryValuation || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>Based on average_cost_price</span>
        </Card>

        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>POTENTIAL REVENUE</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
            {formatCurrency(summary.totalPotentialRevenue || 0)}
          </div>
        </Card>

        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>POTENTIAL PROFIT</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#06C167', marginTop: '4px' }}>
            {formatCurrency(summary.totalPotentialProfit || 0)}
          </div>
        </Card>

        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>OVERALL GROSS MARGIN</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>
            {summary.overallGrossMarginPct || 0}%
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
        {[
          { id: 'valuation', label: `💰 Product Costing & Valuation (${products.length})`, icon: DollarSign },
          { id: 'adjustments', label: `📝 Immutable Stock Audit Trail (${adjustments.length})`, icon: Boxes }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              backgroundColor: activeTab === t.id ? '#06C167' : 'transparent',
              color: activeTab === t.id ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCT COSTING & VALUATION */}
      {activeTab === 'valuation' && (
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            Weighted-Average Costing & Gross Profit Margin Breakdown
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>Product</th>
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Physical Stock</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Avg Cost Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Selling Price</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Line Valuation</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Gross Profit/Unit</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.productId} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px', fontWeight: 800 }}>{p.productName}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{p.category}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>{p.physicalStock}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.averageCostPrice)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(p.sellingPrice)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#047857' }}>{formatCurrency(p.lineValuation)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#0284C7' }}>{formatCurrency(p.grossProfitPerUnit)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#ECFDF5', color: '#047857', fontWeight: 800, fontSize: '0.75rem' }}>
                        {p.grossMarginPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: IMMUTABLE ADJUSTMENT LOGS */}
      {activeTab === 'adjustments' && (
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            Immutable Stock Adjustment Audit Log (Damage, Expiry, Theft & Compensating Reversals)
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Qty Change</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Reason</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Loss Value</th>
                  <th style={{ padding: '10px' }}>Notes</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Audit Actions</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map(adj => (
                  <tr key={adj.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px', color: '#64748B' }}>{adj.created_at?.slice(0, 19).replace('T', ' ')}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: adj.quantity_change > 0 ? '#047857' : '#DC2626' }}>
                      {adj.quantity_change > 0 ? `+${adj.quantity_change}` : adj.quantity_change}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#F1F5F9', color: '#0F172A', fontWeight: 800, fontSize: '0.75rem' }}>
                        {adj.reason}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#DC2626' }}>{formatCurrency(adj.total_loss_value)}</td>
                    <td style={{ padding: '10px', color: '#64748B', maxWidth: '250px' }}>{adj.notes}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {!adj.reverses_adjustment_id && (
                        <button type="button" onClick={() => handleReverseAdjustment(adj.id)} style={{ padding: '4px 8px', background: '#FEF3C7', color: '#D97706', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <RotateCcw size={12} /> Log Reversal
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Adjustment Modal */}
      {showAdjModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Log Inventory Adjustment</h3>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>Product ID</label>
              <input
                type="text"
                placeholder="e.g. p100"
                value={adjProductId}
                onChange={(e) => setAdjProductId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>Quantity Change (Positive or Negative)</label>
              <input
                type="number"
                placeholder="e.g. -5 or +10"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', fontWeight: 800 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>Reason</label>
              <select
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', fontWeight: 800 }}
              >
                <option value="DAMAGE">DAMAGE</option>
                <option value="EXPIRY">EXPIRY</option>
                <option value="THEFT_LOSS">THEFT_LOSS</option>
                <option value="MANUAL_CORRECTION">MANUAL_CORRECTION</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>Notes</label>
              <textarea
                rows={2}
                placeholder="Reason details..."
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAdjModal(false)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF' }}>Cancel</button>
              <button type="button" disabled={submitting} onClick={handleCreateAdjustment} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#06C167', color: '#FFF', fontWeight: 800 }}>Save Adjustment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
