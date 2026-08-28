import React, { useState, useEffect } from 'react';
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  Lock,
  History,
  X,
  RefreshCw
} from 'lucide-react';

export const CashManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Form states
  const [openingCash, setOpeningCash] = useState('1000');
  const [openNotes, setOpenNotes] = useState('Day opening float');

  const [movement, setMovement] = useState({ movementType: 'CASH_IN', amount: '', description: '' });

  const [actualCash, setActualCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const sessRes = await fetch('/api/v1/admin/cash/session');
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setActiveSession(sessData.session || null);
      }

      const histRes = await fetch('/api/v1/admin/cash/history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.sessions || []);
      }
    } catch (e) {
      console.error('Error fetching cash sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash, notes: openNotes })
      });
      if (res.ok) {
        setShowOpenModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to open cash session');
      }
    } catch (e) {
      alert('Error opening cash session');
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/cash/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession?.id, ...movement })
      });
      if (res.ok) {
        setShowMoveModal(false);
        setMovement({ movementType: 'CASH_IN', amount: '', description: '' });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to record cash movement');
      }
    } catch (e) {
      alert('Error recording movement');
    }
  };

  const handleCloseSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/cash/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession?.id, actualCountedCash: actualCash, notes: closeNotes })
      });
      if (res.ok) {
        setShowCloseModal(false);
        setActualCash('');
        setCloseNotes('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to close cash session');
      }
    } catch (e) {
      alert('Error closing cash session');
    }
  };

  const calculatedExpected = activeSession ? (
    parseFloat(activeSession.opening_cash || 0) +
    parseFloat(activeSession.cash_sales || 0) +
    parseFloat(activeSession.cash_in || 0) +
    parseFloat(activeSession.manual_adjustments || 0) -
    parseFloat(activeSession.cash_expenses || 0) -
    parseFloat(activeSession.cash_out || 0)
  ) : 0;

  const currentDiscrepancy = actualCash !== '' ? (parseFloat(actualCash) - calculatedExpected) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Daily Cash Register & Drawer Closing 💵
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Manage opening float, cash movements, counter receipts, expected balance, and closing count reconciliations.
          </p>
        </div>

        <div>
          {!activeSession ? (
            <button
              onClick={() => setShowOpenModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              <Wallet size={18} /> Open Cash Register
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowMoveModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <PlusCircle size={16} /> Cash Movement
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <Lock size={16} /> Close Register Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Session Card */}
      {activeSession ? (
        <div style={{ padding: '24px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>ACTIVE SESSION ({activeSession.session_number})</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Opened by {activeSession.opened_by} at {new Date(activeSession.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>EXPECTED CASH IN DRAWER</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)' }}>
                ₹{calculatedExpected.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}>OPENING FLOAT</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{(activeSession.opening_cash || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#D1FAE5' }}>
              <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>CASH SALES (+)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>+₹{(activeSession.cash_sales || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#DBEAFE' }}>
              <div style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700 }}>CASH IN (+)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E40AF' }}>+₹{(activeSession.cash_in || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FEE2E2' }}>
              <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 700 }}>CASH EXPENSES (-)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626' }}>-₹{(activeSession.cash_expenses || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF3C7' }}>
              <div style={{ fontSize: '0.72rem', color: '#92400E', fontWeight: 700 }}>CASH OUT (-)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#B45309' }}>-₹{(activeSession.cash_out || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <Lock size={40} style={{ color: 'var(--color-text-secondary)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>No Active Cash Register Session</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', margin: '0 0 16px 0' }}>
            Open the register drawer at the beginning of the day to start recording cash receipts and expenses.
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}
          >
            Open Cash Session Now
          </button>
        </div>
      )}

      {/* Cash Sessions History Table */}
      <div style={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} /> Cash Sessions History & Reconciliations
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: '12px 16px' }}>Session Ref</th>
              <th style={{ padding: '12px 16px' }}>Opened</th>
              <th style={{ padding: '12px 16px' }}>Closed</th>
              <th style={{ padding: '12px 16px' }}>Opening</th>
              <th style={{ padding: '12px 16px' }}>Expected Cash</th>
              <th style={{ padding: '12px 16px' }}>Actual Cash</th>
              <th style={{ padding: '12px 16px' }}>Discrepancy</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center' }}>Loading session history...</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No closed cash sessions yet.</td></tr>
            ) : (
              history.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {s.session_number}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {new Date(s.opened_at).toLocaleDateString()} {new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                    {s.closed_at ? `${new Date(s.closed_at).toLocaleDateString()} ${new Date(s.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    ₹{parseFloat(s.opening_cash || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    ₹{parseFloat(s.expected_cash || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    {s.actual_cash !== null ? `₹${parseFloat(s.actual_cash).toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: Math.abs(s.discrepancy || 0) > 0 ? '#DC2626' : '#059669' }}>
                    {s.discrepancy ? `₹${s.discrepancy > 0 ? '+' : ''}${s.discrepancy}` : '₹0'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: s.status === 'OPEN' ? '#D1FAE5' : '#E5E7EB',
                      color: s.status === 'OPEN' ? '#065F46' : '#374151'
                    }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Open Session Modal */}
      {showOpenModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Open Cash Register 💵</h2>
              <button onClick={() => setShowOpenModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleOpenSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Opening Float Cash (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1000"
                  value={openingCash}
                  onChange={e => setOpeningCash(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Opening Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Morning opening cash count"
                  value={openNotes}
                  onChange={e => setOpenNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowOpenModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Open Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMoveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '420px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Record Cash Movement ➕</h2>
              <button onClick={() => setShowMoveModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleRecordMovement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Movement Type *</label>
                <select
                  value={movement.movementType}
                  onChange={e => setMovement({ ...movement, movementType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                >
                  <option value="CASH_IN">CASH_IN (Add cash to drawer)</option>
                  <option value="CASH_OUT">CASH_OUT (Bank deposit / withdrawal)</option>
                  <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500"
                  value={movement.amount}
                  onChange={e => setMovement({ ...movement, amount: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty cash addition"
                  value={movement.description}
                  onChange={e => setMovement({ ...movement, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowMoveModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Save Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Register Modal */}
      {showCloseModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', width: '100%', maxWidth: '440px', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#EF4444' }}>Close Cash Register 🔒</h2>
              <button onClick={() => setShowCloseModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-background)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>System Expected Cash:</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary-dark)' }}>₹{calculatedExpected.toLocaleString('en-IN')}</strong>
            </div>

            <form onSubmit={handleCloseSession} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Actual Counted Cash (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Enter physically counted cash"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '1rem', fontWeight: 800 }}
                />
              </div>

              {actualCash !== '' && Math.abs(currentDiscrepancy) > 0.01 && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.85rem', fontWeight: 700 }}>
                  ⚠️ Discrepancy detected: {currentDiscrepancy > 0 ? `+₹${currentDiscrepancy} (Over)` : `-₹${Math.abs(currentDiscrepancy)} (Short)`}. Explanation notes are required!
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {Math.abs(currentDiscrepancy) > 0.01 ? 'Discrepancy Explanation Notes *' : 'Closing Notes'}
                </label>
                <textarea
                  rows={3}
                  required={Math.abs(currentDiscrepancy) > 0.01}
                  placeholder="Enter closing notes or discrepancy reasons..."
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCloseModal(false)} style={{ padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#EF4444', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Close Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
