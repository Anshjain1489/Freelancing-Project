import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CustomerSegmentsPage = () => {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/crm/segments');
      if (res.data && res.data.data) {
        setSegments(res.data.data.segments || []);
      }
    } catch (err) {
      console.error('Failed to load segments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const criteria = {};
      if (minSpend) criteria.minimum_spend = parseFloat(minSpend);
      if (minOrders) criteria.minimum_orders = parseInt(minOrders, 10);

      const res = await api.post('/crm/segments', {
        name,
        slug,
        description,
        criteria
      });

      if (res.data && res.data.success) {
        alert('Custom segment created successfully!');
        setShowModal(false);
        setName('');
        setSlug('');
        setDescription('');
        setMinSpend('');
        setMinOrders('');
        fetchSegments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create segment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
        <p>Loading Customer Segments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🏷️</span> Customer Segmentation Rules & Criteria
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System & custom JSONB behavioral rules for automated customer targeting.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
        >
          + Create Custom Segment
        </button>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {segments.map((seg) => (
          <div key={seg.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-full">
                  {seg.slug}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                  seg.is_system ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {seg.is_system ? 'SYSTEM' : 'CUSTOM'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{seg.name}</h3>
              <p className="text-xs text-slate-600 mt-1">{seg.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-slate-400">Rules Criteria (JSONB)</p>
              <pre className="text-xs font-mono text-slate-700 mt-1 overflow-x-auto">
                {JSON.stringify(seg.criteria || {}, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Create Custom Segment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateSegment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Segment Name</label>
                <input
                  type="text"
                  placeholder="e.g. Festival Heavy Buyers"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Slug (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. FESTIVAL_BUYERS"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short explanation of targeting rule"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Orders</label>
                  <input
                    type="number"
                    placeholder="e.g. 3"
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Save Segment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSegmentsPage;
