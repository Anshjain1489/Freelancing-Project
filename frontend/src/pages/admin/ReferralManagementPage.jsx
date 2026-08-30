import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReferralManagementPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralsAdmin();
  }, []);

  const fetchReferralsAdmin = async () => {
    try {
      setLoading(true);
      const res = await api.get('/referrals/admin');
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load referral admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mb-2"></div>
        <p>Loading Referral Program Management...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const codes = data?.codes || [];
  const referrals = data?.referrals || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🎁</span> Referral Program Administration & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor customer referral codes, qualified first orders, and append-only reward accounting.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Referral Codes</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.totalCodes || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Successful Qualified Referrals</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{summary.totalSuccessful || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Qualification</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{summary.totalPending || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Rewards Value Issued</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">₹{summary.totalRewardsValue || 0}</p>
        </div>
      </div>

      {/* Referral Codes List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 font-bold text-slate-800 text-base">
          Active Customer Referral Codes
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer Code</th>
                <th className="py-3.5 px-6">Referral Code</th>
                <th className="py-3.5 px-6 text-center">Total Referred</th>
                <th className="py-3.5 px-6 text-center">Successful</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No active referral codes generated yet.
                  </td>
                </tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-mono font-semibold text-xs text-slate-900">
                      {c.user_id}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-purple-700">
                      {c.code}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-slate-800">
                      {c.total_referrals || 0}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-emerald-600">
                      {c.successful_referrals || 0}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                        ACTIVE
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

export default ReferralManagementPage;
