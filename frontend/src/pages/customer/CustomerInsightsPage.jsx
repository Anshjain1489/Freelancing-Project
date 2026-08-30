import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CustomerInsightsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await api.get('/crm/insights');
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mb-2"></div>
        <p>Loading your shopping insights...</p>
      </div>
    );
  }

  const profile = data?.profile || {};
  const segments = data?.segments || [];
  const insights = data?.insights || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-white/20 text-xs font-mono font-bold rounded-full">
            {profile.customer_code || 'CKS-CUST'}
          </span>
          <h1 className="text-2xl font-bold mt-2 flex items-center gap-2">
            <span>✨</span> Your Personal Shopping Intelligence
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            Track your order metrics, savings, customer health, and personalized recommendations.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/20 text-right">
          <p className="text-xs text-emerald-200">Customer Tier Segment</p>
          <p className="text-lg font-bold text-white uppercase">{profile.customer_segment || 'NEW_CUSTOMER'}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{profile.completed_orders || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Completed orders</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spend</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">₹{profile.total_spend || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Lifetime grocery purchases</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value (AOV)</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">₹{profile.average_order_value || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Per cart transaction</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shopping Status</p>
          <p className="text-xl font-bold text-indigo-600 mt-2">{insights.spendingStatus || 'Standard Shopper'}</p>
          <p className="text-xs text-slate-500 mt-1">{insights.orderFrequency}</p>
        </div>
      </div>

      {/* Active Customer Segments */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>🏷️</span> Active Customer Program Memberships
        </h3>
        <div className="flex flex-wrap gap-3">
          {segments.length === 0 ? (
            <span className="text-sm text-slate-400">Standard Customer Account</span>
          ) : (
            segments.map((s) => (
              <div key={s.id} className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {s.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsightsPage;
