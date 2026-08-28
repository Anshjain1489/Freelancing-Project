import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import {
  Truck,
  FileText,
  Boxes,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  Edit,
  XCircle,
  Eye
} from 'lucide-react';

export const ProcurementPage = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'suppliers', 'auto'
  
  // Modals
  const [receivingPo, setReceivingPo] = useState(null);
  const [receivingItems, setReceivingItems] = useState({});
  const [editingPo, setEditingPo] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [editingNotes, setEditingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, poRes] = await Promise.all([
        adminService.getProcurementSuppliers(),
        adminService.getOperationsOverview()
      ]);

      setSuppliers(supRes.data?.suppliers || []);
      setPurchaseOrders(poRes.data?.purchaseOrders || []);
    } catch (err) {
      console.error('Failed to fetch procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (poId, nextStatus, notes = '') => {
    try {
      await adminService.updatePOStatus(poId, nextStatus, notes);
      alert(`PO status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update PO status');
    }
  };

  const handleTriggerAutoProcurement = async () => {
    setSubmitting(true);
    try {
      const res = await adminService.triggerAutoProcurement();
      const data = res.data || {};
      setUnassignedProducts(data.unassignedProducts || []);
      alert(`Automated procurement generated ${data.createdPOsCount || 0} Purchase Orders.${data.unassignedCount > 0 ? ` Note: ${data.unassignedCount} products require supplier assignment.` : ''}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to run auto-procurement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReceiveModal = (po) => {
    setReceivingPo(po);
    const initial = {};
    (po.purchase_order_items || po.items || []).forEach(item => {
      initial[item.id || item.product_id] = {
        quantityReceived: item.quantity_ordered - (item.quantity_received || 0),
        quantityDamaged: 0,
        quantityMissing: 0
      };
    });
    setReceivingItems(initial);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPo) return;
    setSubmitting(true);
    try {
      const itemsToReceive = (receivingPo.purchase_order_items || receivingPo.items || []).map(item => {
        const entry = receivingItems[item.id || item.product_id] || {};
        return {
          itemId: item.id,
          productId: item.product_id,
          quantityReceived: parseInt(entry.quantityReceived || 0, 10),
          quantityDamaged: parseInt(entry.quantityDamaged || 0, 10),
          quantityMissing: parseInt(entry.quantityMissing || 0, 10),
          unitCostPrice: item.unit_cost_price
        };
      });

      const res = await adminService.receivePOItemsAtomic(receivingPo.id, itemsToReceive);
      alert('Goods received, physical stock updated & WAC recalculated!');
      setReceivingPo(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to receive goods');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (po) => {
    setEditingPo(po);
    setEditingNotes(po.notes || '');
    setEditingItems(JSON.parse(JSON.stringify(po.purchase_order_items || po.items || [])));
  };

  const handleConfirmEdit = async () => {
    if (!editingPo) return;
    setSubmitting(true);
    try {
      await adminService.editDraftPurchaseOrder(editingPo.id, {
        notes: editingNotes,
        items: editingItems.map(i => ({
          productId: i.product_id,
          productName: i.product_name,
          quantityOrdered: parseInt(i.quantity_ordered || 1, 10),
          unitCostPrice: parseFloat(i.unit_cost_price || 0)
        }))
      });
      alert('Draft Purchase Order updated successfully');
      setEditingPo(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to edit Purchase Order');
    } finally {
      setSubmitting(false);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Procurement & Suppliers' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Supplier Procurement & Goods Receiving 📦🏭
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '2px', fontSize: '0.88rem' }}>
            Enterprise multi-item PO workflow, atomic goods receiving, supplier fill-rate analytics & 1-click procurement
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleTriggerAutoProcurement}
            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#06C167', color: '#FFF', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Zap size={16} /> 1-Click Auto-Procurement
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

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
        {[
          { id: 'pos', label: `📝 Purchase Orders (${purchaseOrders.length})`, icon: FileText },
          { id: 'suppliers', label: `🏭 Supplier Performance (${suppliers.length})`, icon: Truck },
          { id: 'unassigned', label: `⚠️ Unassigned Products (${unassignedProducts.length})`, icon: AlertTriangle }
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

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'pos' && (
        <Card padding="24px">
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
            Multi-Item Purchase Orders Lifecycle & Audit
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>PO Number</th>
                  <th style={{ padding: '10px' }}>Created Date</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Lifecycle Controls</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
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
                      {['DRAFT', 'PENDING_APPROVAL'].includes(po.status) && (
                        <button type="button" onClick={() => handleOpenEditModal(po)} style={{ padding: '4px 8px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Edit size={12} /> Edit
                        </button>
                      )}
                      {po.status === 'DRAFT' && (
                        <button type="button" onClick={() => handleUpdateStatus(po.id, 'PENDING_APPROVAL')} style={{ padding: '4px 8px', background: '#0284C7', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Submit</button>
                      )}
                      {po.status === 'PENDING_APPROVAL' && (
                        <button type="button" onClick={() => handleUpdateStatus(po.id, 'APPROVED')} style={{ padding: '4px 8px', background: '#047857', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                      )}
                      {po.status === 'APPROVED' && (
                        <button type="button" onClick={() => handleUpdateStatus(po.id, 'ORDERED')} style={{ padding: '4px 8px', background: '#06C167', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Order Vendor</button>
                      )}
                      {['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
                        <button type="button" onClick={() => handleOpenReceiveModal(po)} style={{ padding: '4px 8px', background: '#047857', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Receive Stock</button>
                      )}
                      {!['RECEIVED', 'CANCELLED'].includes(po.status) && (
                        <button type="button" onClick={() => handleUpdateStatus(po.id, 'CANCELLED', 'Cancelled by admin')} style={{ padding: '4px 8px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: SUPPLIER PERFORMANCE */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {suppliers.map(sup => (
            <Card key={sup.id} padding="20px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{sup.name}</h3>
                <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706', fontWeight: 800, fontSize: '0.75rem' }}>
                  ★ {sup.performance?.rating || 5.0}
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '4px' }}>Contact: {sup.contact_person || 'N/A'} • {sup.phone || ''}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>ON-TIME DELIVERY</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#047857', marginTop: '2px' }}>{sup.performance?.on_time_delivery_pct || 100}%</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>FILL RATE</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0284C7', marginTop: '2px' }}>{sup.performance?.supplier_fill_rate_pct || 100}%</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>AVG LEAD TIME</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>{sup.performance?.avg_lead_time_days || 3}d</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>LEAD-TIME VARIANCE</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: (sup.performance?.lead_time_variance_days || 0) > 0 ? '#C2410C' : '#047857', marginTop: '2px' }}>
                    {sup.performance?.lead_time_variance_days || 0}d
                  </div>
                </div>
              </div>

              {/* Protected Bank Details Indicator */}
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B' }}>
                <ShieldCheck size={14} color="#0284C7" />
                <span>Bank Details: {sup.bank_details?.account_number || 'Protected & Masked 🔐'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Goods Receiving Modal */}
      {receivingPo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', zIndex: 1300, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '650px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Goods Receiving — PO {receivingPo.po_number}</h3>
            <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>Input Received, Damaged, and Missing quantities. Accepted = Received - Damaged - Missing.</p>

            {(receivingPo.purchase_order_items || receivingPo.items || []).map(item => {
              const entry = receivingItems[item.id || item.product_id] || { quantityReceived: 0, quantityDamaged: 0, quantityMissing: 0 };
              const accepted = Math.max(0, parseInt(entry.quantityReceived || 0, 10) - parseInt(entry.quantityDamaged || 0, 10) - parseInt(entry.quantityMissing || 0, 10));

              return (
                <div key={item.id || item.product_id} style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{item.product_name} (Ordered: {item.quantity_ordered})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700 }}>RECEIVED</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.quantityReceived}
                        onChange={(e) => setReceivingItems({ ...receivingItems, [item.id || item.product_id]: { ...entry, quantityReceived: e.target.value } })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#C2410C', fontWeight: 700 }}>DAMAGED</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.quantityDamaged}
                        onChange={(e) => setReceivingItems({ ...receivingItems, [item.id || item.product_id]: { ...entry, quantityDamaged: e.target.value } })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>MISSING</span>
                      <input
                        type="number"
                        min="0"
                        value={entry.quantityMissing}
                        onChange={(e) => setReceivingItems({ ...receivingItems, [item.id || item.product_id]: { ...entry, quantityMissing: e.target.value } })}
                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700 }}>ACCEPTED</span>
                      <div style={{ padding: '6px', background: '#DCFCE7', borderRadius: '6px', fontWeight: 900, color: '#047857', textAlign: 'center' }}>{accepted}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button type="button" onClick={() => setReceivingPo(null)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFF' }}>Cancel</button>
              <button type="button" disabled={submitting} onClick={handleConfirmReceive} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#047857', color: '#FFF', fontWeight: 800 }}>Confirm Goods Receiving</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
