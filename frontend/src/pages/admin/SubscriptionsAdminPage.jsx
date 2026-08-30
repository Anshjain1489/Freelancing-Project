import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const SubscriptionsAdminPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions/admin/list');
      if (res.data && res.data.data) {
        setSubscriptions(res.data.data.subscriptions || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDispatch = async () => {
    try {
      setDispatching(true);
      setDispatchResult(null);
      const res = await api.post('/subscriptions/admin/dispatch');
      if (res.data && res.data.data) {
        setDispatchResult(res.data.data);
        fetchSubscriptions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to trigger subscription dispatch');
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p>Loading Admin Subscriptions Subsystem...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🥛</span> Grocery Subscriptions & Dispatch Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor active recurring grocery subscriptions and trigger manual batch order dispatches.
          </p>
        </div>
        <button
          onClick={handleTriggerDispatch}
          disabled={dispatching}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {dispatching ? 'Running Batch Dispatch...' : '⚡ Trigger 04:00 AM Dispatch Engine'}
        </button>
      </div>

      {/* Dispatch Result Banner */}
      {dispatchResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="font-bold text-blue-900 text-base mb-2">Batch Dispatch Execution Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-blue-800">
            <div>Total Scheduled Due: <strong>{dispatchResult.totalDue}</strong></div>
            <div>Successfully Generated: <strong className="text-emerald-600">{dispatchResult.successCount}</strong></div>
            <div>Skipped (Already Dispatched): <strong>{dispatchResult.skippedCount}</strong></div>
            <div>Failed (Out of Stock): <strong className="text-rose-600">{dispatchResult.failedCount}</strong></div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Subscriptions</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.total || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deliveries</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{summary.activeCount || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paused Subscriptions</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{summary.pausedCount || 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancelled</p>
          <p className="text-3xl font-extrabold text-slate-400 mt-1">{summary.cancelledCount || 0}</p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Subscribed Product</th>
                <th className="py-3.5 px-6">Frequency</th>
                <th className="py-3.5 px-6 text-center">Qty</th>
                <th className="py-3.5 px-6">Next Delivery Date</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No customer subscriptions created yet.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {sub.users?.full_name || sub.user_id}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {sub.products?.name || 'Staple Product'}
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-600">
                      {sub.frequency}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-blue-600">
                      {sub.quantity}
                    </td>
                    <td className="py-4 px-6 text-xs font-mono font-semibold">
                      {sub.next_delivery_date}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        sub.status === 'PAUSED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sub.status}
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

export default SubscriptionsAdminPage;
