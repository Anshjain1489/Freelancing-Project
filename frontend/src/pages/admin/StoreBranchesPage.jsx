import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StoreBranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mahruni');
  const [state, setState] = useState('Uttar Pradesh');
  const [postalCode, setPostalCode] = useState('284401');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/branches');
      if (res.data && res.data.data) {
        setBranches(res.data.data.branches || []);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/branches/admin', {
        branchCode,
        branchName,
        address,
        city,
        state,
        postalCode,
        phone
      });

      if (res.data && res.data.success) {
        alert('New store branch created successfully!');
        setShowModal(false);
        setBranchCode('');
        setBranchName('');
        setAddress('');
        setPhone('');
        fetchBranches();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBranchStatus = async (id, currentActive) => {
    try {
      const endpoint = currentActive ? `/branches/admin/${id}/deactivate` : `/branches/admin/${id}/activate`;
      const res = await api.post(endpoint);
      if (res.data && res.data.success) {
        fetchBranches();
      }
    } catch (err) {
      alert('Failed to update branch status');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
        <p>Loading Multi-Store Branches...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🏪</span> Enterprise Multi-Store Branches
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage multi-location Kirana store branches, operational settings, and branch statuses.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
        >
          + Add New Store Branch
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-full">
                  {branch.branch_code}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">{branch.branch_name}</h3>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                branch.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {branch.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-2">📍 {branch.address}, {branch.city}, {branch.state} - {branch.postal_code}</p>
            <p className="text-xs text-slate-600 mb-4">📞 Phone: <strong>{branch.phone}</strong></p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Delivery Radius: {branch.settings?.delivery_radius_km || 10} km</span>
              <button
                onClick={() => toggleBranchStatus(branch.id, branch.is_active)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  branch.is_active ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {branch.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Add New Store Branch</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Code (Unique)</label>
                <input
                  type="text"
                  placeholder="e.g. CKS-NORTH"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chaudhary Kirana - North Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Street Address</label>
                <input
                  type="text"
                  placeholder="Street / Market Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreBranchesPage;
