import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const MarketingCampaignsPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [analyticsModal, setAnalyticsModal] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [campaignType, setCampaignType] = useState('PROMOTIONAL');
  const [channel, setChannel] = useState('IN_APP');
  const [subject, setSubject] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/marketing/campaigns');
      if (res.data && res.data.data) {
        setCampaigns(res.data.data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/marketing/campaigns', {
        name,
        campaignType,
        channel,
        subject,
        messageTemplate
      });

      if (res.data && res.data.success) {
        alert('Marketing Campaign draft created!');
        setShowModal(false);
        setName('');
        setSubject('');
        setMessageTemplate('');
        fetchCampaigns();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (campaignId) => {
    if (!window.confirm('Are you sure you want to dispatch this campaign to target audience now?')) return;
    try {
      const res = await api.post(`/marketing/campaigns/${campaignId}/dispatch`);
      if (res.data && res.data.success) {
        alert(`Campaign Dispatched Successfully! Sent: ${res.data.data.sentCount}`);
        fetchCampaigns();
      }
    } catch (err) {
      alert('Failed to dispatch campaign');
    }
  };

  const handleViewAnalytics = async (campaignId) => {
    try {
      const res = await api.get(`/marketing/campaigns/${campaignId}/analytics`);
      if (res.data && res.data.data) {
        setAnalyticsModal(res.data.data);
      }
    } catch (err) {
      alert('Failed to load campaign analytics');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
        <p>Loading Marketing Campaign Manager...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>📣</span> Marketing Campaign Manager & Dispatcher
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, schedule, target segments, and dispatch multi-channel marketing campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
        >
          + Create New Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Campaign Name</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Channel</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Created Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No marketing campaigns created yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-600">
                      {c.campaign_type}
                    </td>
                    <td className="py-4 px-6 text-xs font-mono font-semibold">
                      {c.channel}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        c.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleViewAnalytics(c.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Analytics
                      </button>
                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDispatch(c.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Dispatch ⚡
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Create Marketing Campaign</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Grocery Special Offer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="PROMOTIONAL">PROMOTIONAL</option>
                    <option value="REACTIVATION">REACTIVATION</option>
                    <option value="CART_RECOVERY">CART_RECOVERY</option>
                    <option value="LOYALTY">LOYALTY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="IN_APP">IN_APP</option>
                    <option value="WHATSAPP">WHATSAPP</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Subject Header</label>
                <input
                  type="text"
                  placeholder="Notification Header"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message Template (supports {"{{customer_name}}"})</label>
                <textarea
                  rows="3"
                  placeholder="Hi {{customer_name}}, enjoy 10% off your next grocery order!"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Save Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {analyticsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Campaign Analytics Summary</h3>
              <button onClick={() => setAnalyticsModal(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl">
              <div>Total Deliveries: <strong>{analyticsModal.analytics?.totalDeliveries}</strong></div>
              <div>Sent: <strong className="text-blue-600">{analyticsModal.analytics?.sentCount}</strong></div>
              <div>Delivered: <strong className="text-emerald-600">{analyticsModal.analytics?.deliveredCount}</strong></div>
              <div>Converted: <strong className="text-purple-600">{analyticsModal.analytics?.convertedCount}</strong></div>
            </div>

            <button onClick={() => setAnalyticsModal(null)} className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-xl text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingCampaignsPage;
