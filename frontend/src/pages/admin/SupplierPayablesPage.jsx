import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

export const SupplierPayablesPage = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [targetPaymentId, setTargetPaymentId] = useState(null);

  // Form states
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: ''
  });

  const [reversalReason, setReversalReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/finance/payables');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Error fetching payables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const res = await fetch('/api/v1/admin/finance/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierInvoiceId: selectedInvoice.id,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: paymentData.referenceNumber,
          notes: paymentData.notes
        })
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        setPaymentData({ amount: '', paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Payment failed');
      }
    } catch (e) {
      alert('Error recording supplier payment');
    }
  };

  const handleReversePayment = async (e) => {
    e.preventDefault();
    if (!targetPaymentId || !reversalReason.trim()) return;

    try {
      const res = await fetch(`/api/v1/admin/finance/supplier-payments/${targetPaymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason })
      });

      if (res.ok) {
        setShowReversalModal(false);
        setTargetPaymentId(null);
        setReversalReason('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Payment reversal failed');
      }
    } catch (e) {
      alert('Error reversing payment');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          Supplier Payables (Accounts Payable) 🏭
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Track supplier invoices, partial/full payments, outstanding balances, and payment due dates.
        </p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 700 }}>TOTAL OUTSTANDING BALANCE</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#991B1B', margin: '4px 0' }}>
              ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B91C1C' }}>Across all unpaid supplier invoices</div>
          </div>

          <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
            <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 700 }}>OVERDUE PAYMENTS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#B45309', margin: '4px 0' }}>
              ₹{(summary.overdueAmount || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>Invoices past due date</div>
          </div>

          <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>UPCOMING DUE</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803D', margin: '4px 0' }}>
              ₹{(summary.upcomingDueAmount || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#166534' }}>Due within terms</div>
          </div>
        </div>
      )}

      {/* Supplier Invoices Table */}
      <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} /> Supplier Invoices & Accounts Payable
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '12px 16px' }}>Invoice Ref</th>
              <th style={{ padding: '12px 16px' }}>Supplier</th>
              <th style={{ padding: '12px 16px' }}>Due Date</th>
              <th style={{ padding: '12px 16px' }}>Total Amount</th>
              <th style={{ padding: '12px 16px' }}>Amount Paid</th>
              <th style={{ padding: '12px 16px' }}>Outstanding</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center' }}>Loading supplier payables...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No supplier invoices recorded yet.</td></tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    {inv.suppliers?.name || 'Wholesale Supplier'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {inv.due_date}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    ₹{parseFloat(inv.invoice_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10B981', fontWeight: 700 }}>
                    ₹{parseFloat(inv.amount_paid || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: inv.outstanding_balance > 0 ? '#EF4444' : '#10B981' }}>
                    ₹{parseFloat(inv.outstanding_balance || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: inv.status === 'PAID' ? '#D1FAE5' : inv.status === 'PARTIALLY_PAID' ? '#DBEAFE' : inv.status === 'OVERDUE' ? '#FEE2E2' : '#FEF3C7',
                      color: inv.status === 'PAID' ? '#065F46' : inv.status === 'PARTIALLY_PAID' ? '#1E40AF' : inv.status === 'OVERDUE' ? '#991B1B' : '#92400E'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {inv.outstanding_balance > 0 && inv.status !== 'CANCELLED' && (
                      <button
                        onClick={() => { setSelectedInvoice(inv); setPaymentData({ ...paymentData, amount: String(inv.outstanding_balance) }); setShowPaymentModal(true); }}
                        style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '440px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Record Supplier Payment 💳</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', marginBottom: '14px', fontSize: '0.85rem' }}>
              <div>Invoice: <strong>{selectedInvoice.invoice_number}</strong></div>
              <div>Outstanding Balance: <strong style={{ color: '#EF4444' }}>₹{selectedInvoice.outstanding_balance}</strong></div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.outstanding_balance}
                  required
                  value={paymentData.amount}
                  onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Payment Method</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={e => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                >
                  <option value="BANK_TRANSFER">BANK_TRANSFER (NEFT/RTGS)</option>
                  <option value="UPI">UPI Direct</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="CASH">CASH</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Bank Ref / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-987654321"
                  value={paymentData.referenceNumber}
                  onChange={e => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
