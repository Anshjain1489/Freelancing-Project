import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AbandonedCartPage = () => {
  const [carts, setCarts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  const fetchAbandonedCarts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/marketing/abandoned-carts');
      if (res.data && res.data.data) {
        setCarts(res.data.data.abandonedCarts || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load abandoned carts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setTriggering(true);
      const res = await api.post('/marketing/abandoned-carts/reminders');
      if (res.data && res.data.success) {
        alert(`Cart Recovery Engine Executed! Reminders Sent: ${res.data.data.remindersSent}`);
        fetchAbandonedCarts();
      }
    } catch (err) {
      alert('Failed to trigger cart recovery reminders');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-500 mb-2"></div>
        <p>Loading Abandoned Cart Recovery Subsystem...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🛒</span> Abandoned Cart Recovery & Retention
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Detect inactive carts (>60 mins) and trigger scheduled recovery reminders (Max 2 reminders).
          </p>
        </div>
        <button
          onClick={handleTriggerReminders}
          disabled={triggering}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {triggering ? 'Sending Reminders...' : '⚡ Trigger Cart Recovery Reminders'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Abandoned Carts</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.totalAbandonedCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovered Carts</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{summary.recoveredCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovery Revenue</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">₹{summary.recoveredRevenue || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recovery Conversion Rate</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">{summary.recoveryRatePercentage || 0}%</p>
        </div>
      </div>

      {/* Abandoned Carts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer User ID</th>
                <th className="py-3.5 px-6 text-center">Items</th>
                <th className="py-3.5 px-6">Cart Value</th>
                <th className="py-3.5 px-6">Detected Time</th>
                <th className="py-3.5 px-6 text-center">Reminders Sent</th>
                <th className="py-3.5 px-6">Recovery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {carts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No abandoned carts detected. All active customer carts are healthy!
                  </td>
                </tr>
              ) : (
                carts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900 text-xs">
                      {c.user_id}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-slate-800">
                      {c.item_count}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      ₹{c.cart_value}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(c.detected_at).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-indigo-600">
                      {c.reminder_count} / 2
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        c.recovery_status === 'RECOVERED' ? 'bg-emerald-100 text-emerald-800' :
                        c.recovery_status === 'REMINDER_2_SENT' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.recovery_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartPage;
