import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  RotateCcw,
  Filter,
  Tag,
  Search,
  DollarSign,
  AlertCircle,
  X
} from 'lucide-react';

export const ExpenseManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [targetExpenseId, setTargetExpenseId] = useState(null);

  // Form states
  const [newExpense, setNewExpense] = useState({
    categoryId: '',
    amount: '',
    paymentMethod: 'CASH',
    description: '',
    vendorName: '',
    referenceNumber: '',
    receiptUrl: '',
    autoApprove: false
  });

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [reversalReason, setReversalReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await fetch('/api/v1/admin/finance/expenses/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      let url = '/api/v1/admin/finance/expenses?limit=100';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (categoryFilter) url += `&categoryId=${categoryFilter}`;

      const expRes = await fetch(url);
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
        setSummary(expData.summary || null);
      }
    } catch (e) {
      console.error('Error fetching expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewExpense({ categoryId: '', amount: '', paymentMethod: 'CASH', description: '', vendorName: '', referenceNumber: '', receiptUrl: '', autoApprove: false });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to record expense');
      }
    } catch (e) {
      alert('Error creating expense');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/finance/expenses/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });
      if (res.ok) {
        setShowCategoryModal(false);
        setNewCategory({ name: '', description: '' });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create category');
      }
    } catch (e) {
      alert('Error creating category');
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this operating expense? Approved expenses will post to the financial ledger.')) return;
    try {
      const res = await fetch(`/api/v1/admin/finance/expenses/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Approval failed');
      }
    } catch (e) {
      alert('Error approving expense');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/v1/admin/finance/expenses/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Rejection failed');
      }
    } catch (e) {
      alert('Error rejecting expense');
    }
  };

  const handleReverseSubmit = async (e) => {
    e.preventDefault();
    if (!targetExpenseId || !reversalReason.trim()) return;
    try {
      const res = await fetch(`/api/v1/admin/finance/expenses/${targetExpenseId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason })
      });
      if (res.ok) {
        setShowReversalModal(false);
        setReversalReason('');
        setTargetExpenseId(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Reversal failed');
      }
    } catch (e) {
      alert('Error reversing expense');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Operating Expense Management 💸
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Track, approve, categorise, and reverse store operating expenses with full financial audit trail.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowCategoryModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <Tag size={16} /> Manage Categories
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Record Expense
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '20px', borderRadius: 'var(--radius-lg)', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 700 }}>TOTAL OPERATING EXPENSES</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#991B1B', margin: '4px 0' }}>
              ₹{(summary.totalOperatingExpenses || 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B91C1C' }}>
              {summary.approvedExpensesCount || 0} approved expenses in period
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '16px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={16} /> Filters:
        </span>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">PENDING Approval</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="REVERSED">REVERSED</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Expenses History Table */}
      <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '12px 16px' }}>Expense Ref</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Description & Vendor</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Amount</th>
              <th style={{ padding: '12px 16px' }}>Method</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center' }}>Loading expenses...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No expense records found.</td></tr>
            ) : (
              expenses.map(exp => {
                const categoryObj = categories.find(c => String(c.id) === String(exp.category_id));
                const catName = categoryObj ? categoryObj.name : exp.expense_categories?.name || 'General';

                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {exp.expense_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--color-mint-light)', color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '0.75rem' }}>
                        {catName}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{exp.description}</div>
                      {exp.vendor_name && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Vendor: {exp.vendor_name}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {exp.expense_date}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#EF4444' }}>
                      ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {exp.payment_method}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        backgroundColor: exp.status === 'APPROVED' ? '#D1FAE5' : exp.status === 'PENDING' ? '#FEF3C7' : exp.status === 'REVERSED' ? '#F3E8FF' : '#FEE2E2',
                        color: exp.status === 'APPROVED' ? '#065F46' : exp.status === 'PENDING' ? '#92400E' : exp.status === 'REVERSED' ? '#6B21A8' : '#991B1B'
                      }}>
                        {exp.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {exp.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(exp.id)}
                              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#10B981', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(exp.id)}
                              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {exp.status === 'APPROVED' && (
                          <button
                            onClick={() => { setTargetExpenseId(exp.id); setShowReversalModal(true); }}
                            style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#8B5CF6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RotateCcw size={12} /> Reverse
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Expense Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '500px', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Record Business Expense 💸</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Category *</label>
                <select
                  required
                  value={newExpense.categoryId}
                  onChange={e => setNewExpense({ ...newExpense, categoryId: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Payment Method</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop electricity bill for August"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. UP Power Corp"
                    value={newExpense.vendorName}
                    onChange={e => setNewExpense({ ...newExpense, vendorName: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Ref / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-98765"
                    value={newExpense.referenceNumber}
                    onChange={e => setNewExpense({ ...newExpense, referenceNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={newExpense.autoApprove}
                  onChange={e => setNewExpense({ ...newExpense, autoApprove: e.target.checked })}
                />
                <label htmlFor="autoApprove" style={{ fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                  Auto-approve & post immediately to ledger
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Add Expense Category</h2>
              <button onClick={() => setShowCategoryModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Generator Fuel"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  placeholder="e.g. Diesel fuel expenses"
                  value={newCategory.description}
                  onChange={e => setNewCategory({ ...newCategory, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {showReversalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px 0', color: '#8B5CF6' }}>Audit-Safe Expense Reversal 🔄</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
              Reversing an approved expense creates a compensating reversal entry in the audit log and reverses the financial ledger DEBIT.
            </p>

            <form onSubmit={handleReverseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Reversal Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this expense is being reversed..."
                  value={reversalReason}
                  onChange={e => setReversalReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowReversalModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#8B5CF6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Confirm Reversal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
