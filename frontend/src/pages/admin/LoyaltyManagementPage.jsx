import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const LoyaltyManagementPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [breakdown, setBreakdown] = useState({});
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsDelta, setPointsDelta] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLoyaltyAccounts();
  }, []);

  const fetchLoyaltyAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/loyalty/admin/accounts');
      if (res.data && res.data.data) {
        setAccounts(res.data.data.accounts || []);
        setBreakdown(res.data.data.tierBreakdown || {});
      }
    } catch (err) {
      console.error('Failed to fetch loyalty accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    if (!selectedUser || !pointsDelta || !reason.trim()) {
      alert('Points delta and mandatory reason string are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/loyalty/admin/adjust', {
        userId: selectedUser.user_id,
        pointsDelta: parseInt(pointsDelta, 10),
        reason: reason.trim()
      });

      if (res.data && res.data.success) {
        alert('Loyalty points adjusted cleanly!');
        setSelectedUser(null);
        setPointsDelta('');
        setReason('');
        fetchLoyaltyAccounts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust points');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
        <p>Loading Admin Loyalty Subsystem...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>⭐</span> Loyalty Rules & Customer Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track customer reward balances, tier breakdowns (Silver, Gold, Platinum), and perform audited point adjustments.
          </p>
        </div>
      </div>

      {/* Tier Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🥈 Silver Members</p>
          <p className="text-3xl font-extrabold text-slate-700 mt-1">{breakdown.silverCount || 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">🥇 Gold Members</p>
          <p className="text-3xl font-extrabold text-amber-700 mt-1">{breakdown.goldCount || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 shadow-md text-white">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">👑 Platinum VIP Members</p>
          <p className="text-3xl font-extrabold text-white mt-1">{breakdown.platinumCount || 0}</p>
        </div>
      </div>

      {/* Customer Loyalty Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-800 text-base">
          Customer Loyalty Leaderboard
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Tier Level</th>
                <th className="py-3.5 px-6 text-right">Available Points</th>
                <th className="py-3.5 px-6 text-right">Lifetime Earned</th>
                <th className="py-3.5 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    No customer loyalty profiles generated yet.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {acc.users?.full_name || acc.user_id}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        acc.tier === 'PLATINUM' ? 'bg-slate-900 text-amber-400' :
                        acc.tier === 'GOLD' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {acc.tier}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-amber-600">
                      {acc.points_balance} pts
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-700">
                      {acc.lifetime_points} pts
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => setSelectedUser(acc)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                      >
                        ⚙️ Adjust Points
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Points Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Adjust Loyalty Points</h3>
            <p className="text-xs text-slate-500 mb-4">Customer: {selectedUser.users?.full_name || selectedUser.user_id}</p>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Points Delta (+ or -)</label>
                <input
                  type="number"
                  placeholder="e.g. +100 or -50"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mandatory Reason String</label>
                <textarea
                  rows="3"
                  placeholder="Explain why points are being manually adjusted..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700">Submit Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyManagementPage;
