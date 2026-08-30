import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CustomerCRMDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const fetchCustomerDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/crm/customers/${id}`);
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load customer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
        <p>Loading Customer Deep Analytics Profile...</p>
      </div>
    );
  }

  const profile = data?.profile || {};
  const segments = data?.segments || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/admin/crm')} className="text-xs text-indigo-600 font-semibold mb-2 block">
            ← Back to CRM List
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>👤</span> Customer Profile: {profile.customer_code}
          </h1>
          <p className="text-xs text-slate-500 mt-1">User Identifier: {profile.user_id}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-mono font-bold rounded-full border border-indigo-200">
          RFM: {profile.rfm_score || 'R1F1M1'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Completed Orders</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{profile.completed_orders || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Lifetime Spend</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">₹{profile.total_spend || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Order Value</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">₹{profile.average_order_value || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated CLV</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">₹{profile.customer_lifetime_value || 0}</p>
        </div>
      </div>

      {/* Segments */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-800 text-base">Active Segment Memberships</h3>
        <div className="flex flex-wrap gap-3">
          {segments.map((s) => (
            <span key={s.id} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200">
              {s.name} ({s.slug})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerCRMDetailPage;
