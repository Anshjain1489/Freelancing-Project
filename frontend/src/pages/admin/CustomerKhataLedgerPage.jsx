import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CustomerKhataLedgerPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Selected customer for modal/actions
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [modalType, setModalType] = useState(''); // 'LIMIT', 'REPAYMENT', 'REMINDER'
  const [inputVal, setInputVal] = useState('');
  const [repayMethod, setRepayMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [reminderData, setReminderData] = useState(null);

  useEffect(() => {
    fetchKhataAccounts();
  }, []);

  const fetchKhataAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/credit/admin/accounts');
      if (res.data && res.data.data) {
        setAccounts(res.data.data.accounts || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load Khata accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (e) => {
    e.preventDefault();
    if (!selectedAcc || !inputVal) return;

    try {
      setSubmitting(true);
      const res = await api.patch(`/credit/admin/accounts/${selectedAcc.user_id}/limit`, {
        creditLimit: parseFloat(inputVal)
      });
      if (res.data && res.data.success) {
        alert('Customer credit limit updated!');
        setModalType('');
        fetchKhataAccounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update credit limit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    if (!selectedAcc || !inputVal) return;

    try {
      setSubmitting(true);
      const res = await api.post(`/credit/admin/accounts/${selectedAcc.user_id}/repayment`, {
        amount: parseFloat(inputVal),
        paymentMethod: repayMethod,
        notes: 'Admin cash collection at store'
      });
      if (res.data && res.data.success) {
        alert('Repayment recorded cleanly!');
        setModalType('');
        fetchKhataAccounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record repayment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetReminder = async (acc) => {
    try {
      setSelectedAcc(acc);
      const res = await api.get(`/credit/admin/accounts/${acc.user_id}/reminder`);
      if (res.data && res.data.data) {
        setReminderData(res.data.data);
        setModalType('REMINDER');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate reminder');
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const nameMatch = (acc.users?.full_name || acc.user_id || '').toLowerCase().includes(search.toLowerCase());
    const phoneMatch = (acc.users?.phone_number || '').includes(search);
    const statusMatch = !filterStatus || acc.status === filterStatus;
    return (nameMatch || phoneMatch) && statusMatch;
  });

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-2"></div>
        <p>Loading Admin Udhar Khata Ledger...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📖</span> Customer Udhar Khata Ledger Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer credit accounts, record cash repayments, update credit limits, and trigger WhatsApp payment reminders.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Khata Accounts</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.activeAccounts || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-md text-white">
          <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Total Market Receivables (Due)</p>
          <p className="text-3xl font-extrabold mt-1">₹{(summary.totalOutstanding || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Khata Accounts</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.totalAccounts || 0}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <input
          type="text"
          placeholder="🔍 Search customer name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Khata Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer Details</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Credit Limit</th>
                <th className="py-3.5 px-6 text-right">Outstanding Due</th>
                <th className="py-3.5 px-6 text-right">Available Credit</th>
                <th className="py-3.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No Udhar Khata accounts match search criteria.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{acc.users?.full_name || 'Customer Profile'}</p>
                      <p className="text-xs text-slate-500">{acc.users?.phone_number || acc.user_id}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        acc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-800">
                      ₹{acc.credit_limit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-amber-600">
                      ₹{acc.outstanding_balance.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-600">
                      ₹{acc.available_credit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedAcc(acc); setInputVal(acc.credit_limit); setModalType('LIMIT'); }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                        >
                          Limit
                        </button>
                        <button
                          onClick={() => { setSelectedAcc(acc); setInputVal(''); setModalType('REPAYMENT'); }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg"
                        >
                          + Repay
                        </button>
                        {acc.outstanding_balance > 0 && (
                          <button
                            onClick={() => handleGetReminder(acc)}
                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg"
                          >
                            💬 WhatsApp
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modalType === 'LIMIT' && selectedAcc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Update Credit Limit</h3>
            <p className="text-xs text-slate-500 mb-4">Assign approved store credit threshold for customer {selectedAcc.users?.full_name || selectedAcc.user_id}.</p>
            <form onSubmit={handleUpdateLimit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalType('')} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Save Limit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === 'REPAYMENT' && selectedAcc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Record Khata Cash/UPI Repayment</h3>
            <p className="text-xs text-slate-500 mb-4">Outstanding Balance: <strong>₹{selectedAcc.outstanding_balance}</strong></p>
            <form onSubmit={handleRecordRepayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Repayment Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedAcc.outstanding_balance}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Channel</label>
                <select
                  value={repayMethod}
                  onChange={(e) => setRepayMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalType('')} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === 'REMINDER' && reminderData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">WhatsApp Udhar Reminder</h3>
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 font-mono whitespace-pre-wrap mb-4 border border-slate-200">
              {reminderData.messageText}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalType('')} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Close</button>
              <a
                href={reminderData.clickToChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-green-600 text-white text-center rounded-xl text-sm font-semibold hover:bg-green-700"
              >
                Send via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerKhataLedgerPage;
