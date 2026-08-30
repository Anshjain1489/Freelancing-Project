import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CustomerCRMPage = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [selectedSegment]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedSegment) params.segment = selectedSegment;
      if (search) params.search = search;

      const res = await api.get('/crm/customers', { params });
      if (res.data && res.data.data) {
        setProfiles(res.data.data.profiles || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load CRM profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
        <p>Loading Customer CRM Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>👥</span> Customer Relationship Management (CRM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Central customer profiles, RFM scores, Customer Lifetime Value (CLV), and behavioral metrics.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/crm/segments')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            🏷️ Customer Segments
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total CRM Profiles</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.totalCustomers || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customer Revenue</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">₹{summary.totalRevenue || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Value VIPs</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">{summary.highValueCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">At-Risk Accounts</p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">{summary.atRiskCount || 0}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex gap-2">
          <input
            type="text"
            placeholder="Search by customer code or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl">
            Search
          </button>
        </form>

        <select
          value={selectedSegment}
          onChange={(e) => setSelectedSegment(e.target.value)}
          className="w-full md:w-64 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Segments</option>
          <option value="NEW_CUSTOMER">New Customers</option>
          <option value="ACTIVE_CUSTOMER">Active Customers</option>
          <option value="REPEAT_CUSTOMER">Repeat Customers</option>
          <option value="HIGH_VALUE">High Value VIPs</option>
          <option value="AT_RISK">At Risk</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* CRM Profiles Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-6">Customer Code</th>
                <th className="py-3.5 px-6">Segment</th>
                <th className="py-3.5 px-6 text-center">Orders</th>
                <th className="py-3.5 px-6">Total Spend</th>
                <th className="py-3.5 px-6">AOV</th>
                <th className="py-3.5 px-6">RFM Score</th>
                <th className="py-3.5 px-6">Est. CLV</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No customer CRM profiles found.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-700">
                      {p.customer_code}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        p.customer_segment === 'HIGH_VALUE' ? 'bg-indigo-100 text-indigo-800' :
                        p.customer_segment === 'AT_RISK' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.customer_segment}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-slate-800">
                      {p.completed_orders || 0}
                    </td>
                    <td className="py-4 px-6 font-bold text-emerald-600">
                      ₹{p.total_spend || 0}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      ₹{p.average_order_value || 0}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-purple-700 text-xs">
                      {p.rfm_score || 'R1F1M1'}
                    </td>
                    <td className="py-4 px-6 font-bold text-blue-600">
                      ₹{p.customer_lifetime_value || 0}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/admin/crm/customers/${p.user_id}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        View Profile
                      </button>
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

export default CustomerCRMPage;
