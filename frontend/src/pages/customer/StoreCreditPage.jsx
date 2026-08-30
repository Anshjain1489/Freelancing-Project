import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StoreCreditPage = () => {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repayAmount, setRepayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStatement();
  }, []);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await api.get('/credit/statement');
      if (res.data && res.data.data) {
        setStatement(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load store credit statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRepayment = async (e) => {
    e.preventDefault();
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive repayment amount' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const res = await api.post('/credit/repayment', {
        amount: parseFloat(repayAmount),
        paymentMethod
      });

      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: 'Khata Repayment recorded successfully!' });
        setRepayAmount('');
        fetchStatement();
      }
    } catch (err) {
      const errText = err.response?.data?.message || 'Failed to process repayment';
      setMessage({ type: 'error', text: errText });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-2"></div>
        <p>Loading Udhar Khata Statement...</p>
      </div>
    );
  }

  const account = statement?.account || {};
  const summary = statement?.summary || {};
  const transactions = statement?.transactions || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📖</span> Customer Udhar Khata & Store Credit
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your store credit limit, view ledger transactions, and make cash/UPI balance repayments.
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full w-fit ${
          account.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}>
          Status: {account.status || 'ACTIVE'}
        </span>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${
          message.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="font-bold">✕</button>
        </div>
      )}

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Approved Credit Limit</p>
          <p className="text-3xl font-extrabold text-slate-900">₹{(summary.creditLimit || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-2">Maximum Udhar capacity assigned by store admin</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-md text-white">
          <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider mb-1">Current Outstanding Due</p>
          <p className="text-3xl font-extrabold">₹{(summary.outstandingBalance || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-amber-100 mt-2">Amount to be settled with Chaudhary Kirana Store</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Available Credit</p>
          <p className="text-3xl font-extrabold text-emerald-600">₹{(summary.availableCredit || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-500 mt-2">Ready for instant checkout credit orders</p>
        </div>
      </div>

      {/* Online Repayment Widget */}
      {summary.outstandingBalance > 0 && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-2">💳 Settle Outstanding Khata Balance</h2>
          <p className="text-sm text-slate-600 mb-4">Make a quick online repayment to reduce your due balance and restore credit capacity.</p>

          <form onSubmit={handleRepayment} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Repayment Amount (₹)</label>
              <input
                type="number"
                min="1"
                max={summary.outstandingBalance}
                step="any"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder={`Max ₹${summary.outstandingBalance}`}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
              >
                <option value="UPI">UPI Payment</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CASH">Cash at Store</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Submit Repayment'}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Udhar Statement Ledger</h2>
          <span className="text-xs text-slate-400 font-semibold">{transactions.length} Total Transactions</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-3xl mb-2">📄</p>
            <p className="font-semibold text-slate-600">No Store Credit Transactions Yet</p>
            <p className="text-xs mt-1">Purchases made on Udhar will appear in this ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Date & Time</th>
                  <th className="py-3 px-6">Transaction Type</th>
                  <th className="py-3 px-6">Reference / Notes</th>
                  <th className="py-3 px-6 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        tx.transaction_type === 'DEBIT_PURCHASE' ? 'bg-amber-100 text-amber-800' :
                        tx.transaction_type === 'CREDIT_REPAYMENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {tx.transaction_type === 'DEBIT_PURCHASE' ? '🛒 Purchase (Udhar)' :
                         tx.transaction_type === 'CREDIT_REPAYMENT' ? '💵 Repayment' : tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {tx.notes || tx.reference_id || 'Store Transaction'}
                    </td>
                    <td className={`py-4 px-6 text-right font-bold ${
                      tx.transaction_type === 'DEBIT_PURCHASE' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {tx.transaction_type === 'DEBIT_PURCHASE' ? '+' : '-'}₹{parseFloat(tx.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreCreditPage;
