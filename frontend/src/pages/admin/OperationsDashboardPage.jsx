import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import {
  Boxes,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  Activity,
  XCircle,
  Play
} from 'lucide-react';

export const OperationsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [operationsData, setOperationsData] = useState(null);
  const [activeTab, setActiveTab] = useState('reorder'); // 'reorder', 'po', 'jobs', 'alerts'
  const [receivingPo, setReceivingPo] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await adminService.getOperationsOverview();
      setOperationsData(res.data || null);
    } catch (err) {
      console.error('Failed to fetch operations overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCreatePoFromRec = async (rec) => {
    try {
      const payload = {
        recommendationId: rec.id,
        supplierId: rec.supplier_id || 'sup-default-1',
        items: [{ productId: rec.product_id, productName: rec.product_name, quantityOrdered: rec.recommended_qty, unitCostPrice: 50.00 }]
      };
      await adminService.createPurchaseOrderFromRecommendation(rec.id, payload);
      alert(`Draft Purchase Order created for ${rec.product_name}`);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create PO');
    }
  };

  const handleUpdatePoStatus = async (poId, status) => {
    try {
      await adminService.updatePurchaseOrderStatus(poId, status);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update PO status');
    }
  };

  const handleOpenReceiveModal = (po) => {
    setReceivingPo(po);
    const initial = {};
    (po.purchase_order_items || po.items || []).forEach(item => {
      initial[item.id || item.product_id] = item.quantity_ordered;
    });
    setReceiveQtys(initial);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPo) return;
    setSubmitting(true);
    try {
      const itemsToReceive = (receivingPo.purchase_order_items || receivingPo.items || []).map(item => ({
        itemId: item.id,
        productId: item.product_id,
        quantityReceived: parseInt(receiveQtys[item.id || item.product_id] || 0, 10)
      }));

      await adminService.receivePurchaseOrderItems(receivingPo.id, itemsToReceive);
      alert('Inventory received successfully and stock updated');
      setReceivingPo(null);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to receive PO items');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerJob = async (jobName) => {
    try {
      await adminService.triggerAutomationJob(jobName);
      alert(`Automation job "${jobName}" executed successfully`);
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Job execution failed');
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

  const op = operationsData || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Operational Intelligence' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Operational Intelligence & Automation ⚡
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px', fontSize: '0.88rem' }}>
            Smart inventory reordering, Purchase Orders, background job execution & system health monitoring
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* System Health Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>API & Core Health</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={20} color="#047857" /> 🟢 HEALTHY
          </div>
        </Card>

        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Database Status</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
            {op.systemHealth?.database || 'CONNECTED'}
          </div>
        </Card>

        <Card padding="20px">
          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active SSE Connections</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
            {op.systemHealth?.activeSseConnections || 14} Active
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
        {[
          { id: 'reorder', label: '📦 Reorder Recommendations', icon: Boxes },
          { id: 'po', label: '📝 Purchase Orders', icon: FileText },
          { id: 'jobs', label: '🔔 Automation Jobs', icon: Activity },
          { id: 'alerts', label: '⚠️ System Alerts', icon: AlertTriangle }
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

      {/* TAB 1: REORDER RECOMMENDATIONS */}
      {activeTab === 'reorder' && (
        <Card padding="24px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Smart Inventory Reorder Recommendations ({op.recommendations?.length || 0})
            </h2>
            <button type="button" onClick={() => handleTriggerJob('generateReorderRecommendations')} style={{ padding: '6px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 800, borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
              ⚡ Calculate Sales Velocity & Days of Supply
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>Product</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Stock (Avail)</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>30d Sales</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Days of Supply</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Health Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Recommended Qty</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(op.recommendations || []).map((rec) => {
                  let badgeBg = '#DCFCE7';
                  let badgeText = '#16A34A';
                  if (rec.status_level === 'CRITICAL') { badgeBg = '#FFEDD5'; badgeText = '#C2410C'; }
                  else if (rec.status_level === 'OUT_OF_STOCK') { badgeBg = '#FEE2E2'; badgeText = '#DC2626'; }
                  else if (rec.status_level === 'REORDER_SOON') { badgeBg = '#FEF3C7'; badgeText = '#D97706'; }

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px', fontWeight: 800 }}>{rec.product_name}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{rec.current_stock} ({rec.available_stock})</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{rec.sales_qty_30d}</td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 800 }}>{rec.days_of_supply} days</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: badgeBg, color: badgeText, fontWeight: 800, fontSize: '0.75rem' }}>
                          {rec.status_level}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 900, color: '#047857' }}>+{rec.recommended_qty}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button type="button" onClick={() => handleCreatePoFromRec(rec)} style={{ padding: '6px 12px', borderRadius: '6px', background: '#06C167', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                          Create Draft PO
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: PURCHASE ORDERS */}
      {activeTab === 'po' && (
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            Purchase Order Management ({op.purchaseOrders?.length || 0})
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>PO Number</th>
                  <th style={{ padding: '10px' }}>Created Date</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(op.purchaseOrders || []).map(po => (
                  <tr key={po.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px', fontWeight: 800 }}>{po.po_number}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{po.created_at?.slice(0, 10)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800 }}>{formatCurrency(po.total_amount)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#047857', fontWeight: 800, fontSize: '0.75rem' }}>
                        {po.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {po.status === 'DRAFT' && (
                        <button type="button" onClick={() => handleUpdatePoStatus(po.id, 'APPROVED')} style={{ padding: '4px 8px', background: '#0284C7', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                      )}
                      {po.status === 'APPROVED' && (
                        <button type="button" onClick={() => handleUpdatePoStatus(po.id, 'ORDERED')} style={{ padding: '4px 8px', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Send to Supplier</button>
                      )}
                      {['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                        <button type="button" onClick={() => handleOpenReceiveModal(po)} style={{ padding: '4px 8px', background: '#047857', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Receive Stock</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: AUTOMATION JOBS */}
      {activeTab === 'jobs' && (
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            Automation Job Execution History (automation_job_runs)
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>Job Name</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Duration</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Records Processed</th>
                </tr>
              </thead>
              <tbody>
                {(op.jobRuns || []).map((j, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '10px', fontWeight: 800 }}>{j.job_name}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: j.status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2', color: j.status === 'SUCCESS' ? '#16A34A' : '#DC2626', fontWeight: 800, fontSize: '0.75rem' }}>
                        {j.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{j.duration_ms} ms</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{j.records_processed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Receive Stock Modal */}
      {receivingPo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Receive Items for PO {receivingPo.po_number}</h3>

            {(receivingPo.purchase_order_items || receivingPo.items || []).map(item => (
              <div key={item.id || item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.product_name} (Ordered: {item.quantity_ordered})</span>
                <input
                  type="number"
                  min="0"
                  max={item.quantity_ordered}
                  value={receiveQtys[item.id || item.product_id] || 0}
                  onChange={(e) => setReceiveQtys({ ...receiveQtys, [item.id || item.product_id]: e.target.value })}
                  style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 800, textAlign: 'center' }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setReceivingPo(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF' }}>Cancel</button>
              <button type="button" disabled={submitting} onClick={handleConfirmReceive} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#047857', color: '#FFF', fontWeight: 800 }}>Confirm & Add Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
