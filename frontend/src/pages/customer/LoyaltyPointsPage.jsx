import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const LoyaltyPointsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      const [accRes, ledgerRes] = await Promise.all([
        api.get('/loyalty/account'),
        api.get('/loyalty/ledger')
      ]);

      setData({
        account: accRes.data?.data || {},
        ledger: ledgerRes.data?.data?.ledger || []
      });
    } catch (err) {
      console.error('Failed to fetch loyalty data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
        <p>Loading Loyalty Points & Rewards...</p>
      </div>
    );
  }

  const account = data?.account || {};
  const ledger = data?.ledger || [];
  const progress = account.tierProgress || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <span>⭐</span> Customer Loyalty & Rewards
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Earn 1 point per ₹100 spent. Redeem points at checkout for direct order discounts (up to 50% max order value).
        </p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 rounded-2xl p-6 shadow-md text-white">
          <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider mb-1">Available Loyalty Points</p>
          <p className="text-4xl font-black">{account.points_balance || 0} pts</p>
          <p className="text-xs text-amber-100 mt-2 font-medium">Equivalency Value: ₹{account.rupee_value || 0} Discount</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Member Tier</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl">
              {account.tier === 'PLATINUM' ? '👑' : account.tier === 'GOLD' ? '🥇' : '🥈'}
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900">{account.tier || 'SILVER'}</p>
              <p className="text-xs text-emerald-600 font-semibold">{progress.multiplier || 1.0}x Point Earning Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Lifetime Earned Points</p>
          <p className="text-3xl font-extrabold text-slate-900">{account.lifetime_points || 0} pts</p>
          <p className="text-xs text-slate-500 mt-2">Total rewards accumulated over time</p>
        </div>
      </div>

      {/* Tier Progress Bar */}
      {progress.nextTier && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="font-semibold text-slate-300">Progress to {progress.nextTier} Tier</span>
            <span className="text-amber-400 font-bold">{progress.pointsNeededForNextTier} pts needed</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(10, ((account.lifetime_points || 0) / (account.lifetime_points + progress.pointsNeededForNextTier)) * 100))}%`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Loyalty Rules Card */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 mb-8">
        <h2 className="text-base font-bold text-amber-900 mb-2 flex items-center gap-2">
          <span>💡</span> How Loyalty Rewards Work
        </h2>
        <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
          <li><strong>Earning:</strong> Earn 1 point per ₹100 spent on all completed orders. Higher tiers get point multipliers (Gold: 1.5x, Platinum: 2.0x).</li>
          <li><strong>Redemption Value:</strong> 1 Point = ₹1 Rupee discount value at checkout.</li>
          <li><strong>Redemption Safety Rule:</strong> Maximum redemption allowed per order is capped at <strong>50% of eligible order subtotal</strong> to protect store margins.</li>
        </ul>
      </div>

      {/* Points History Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Points Audit Ledger</h2>
          <span className="text-xs text-slate-400 font-semibold">{ledger.length} History Logs</span>
        </div>

        {ledger.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-3xl mb-2">🏅</p>
            <p className="font-semibold text-slate-600">No Loyalty Activity Recorded Yet</p>
            <p className="text-xs mt-1">Place grocery orders to start accumulating rewards points.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Activity Type</th>
                  <th className="py-3 px-6">Details / Notes</th>
                  <th className="py-3 px-6 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        item.points > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.transaction_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">{item.notes || 'Points update'}</td>
                    <td className={`py-4 px-6 text-right font-bold text-base ${
                      item.points > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {item.points > 0 ? `+${item.points}` : item.points}
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

export default LoyaltyPointsPage;
