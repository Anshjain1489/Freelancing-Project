import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReferralPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralSummary();
  }, []);

  const fetchReferralSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/referrals');
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load referral summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (data?.referralCode) {
      const text = encodeURIComponent(`Shop fresh groceries at Chaudhary Kirana Store! Use my referral code ${data.referralCode} to get bonus reward points on your first order! ${data.referralLink}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
        <p>Loading your referral dashboard...</p>
      </div>
    );
  }

  const referralCode = data?.referralCode || 'REF-CKS';
  const stats = data?.stats || {};
  const referrals = data?.referrals || [];
  const rewardHistory = data?.rewardHistory || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🎁</span> Refer Friends & Earn Grocery Rewards
          </h1>
          <p className="text-purple-100 text-sm mt-1">
            Invite your neighbors to shop at Chaudhary Kirana Store. Earn 100 Loyalty Points (₹50 value) for every qualified first order!
          </p>
        </div>
      </div>

      {/* Code & Share Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Unique Referral Code</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-5 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 font-mono text-xl font-extrabold rounded-xl tracking-wider">
              {referralCode}
            </span>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              {copied ? 'Copied! ✓' : 'Copy Link'}
            </button>
          </div>
        </div>

        <button
          onClick={handleWhatsAppShare}
          className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <span>💬</span> Share via WhatsApp
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invited</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{stats.totalReferrals || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Successful Referrals</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.successfulCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Orders</p>
          <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.pendingCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Points Earned</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-1">{stats.totalPointsEarned || 0} pts</p>
        </div>
      </div>

      {/* Reward History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 font-bold text-slate-800 text-base">
          Referral Reward Ledger History
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Reward Type</th>
                <th className="py-3.5 px-6">Points / Value</th>
                <th className="py-3.5 px-6">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {rewardHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">
                    No referral reward entries yet. Start sharing your referral link above!
                  </td>
                </tr>
              ) : (
                rewardHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-bold text-purple-700">
                      {item.reward_type}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      +{item.points} Points (₹{item.cash_value})
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      {item.reason}
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

export default ReferralPage;
