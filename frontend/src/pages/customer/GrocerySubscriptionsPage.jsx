import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const GrocerySubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState('DAILY');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSubscriptions();
    fetchProducts();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions');
      if (res.data && res.data.data) {
        setSubscriptions(res.data.data.subscriptions || []);
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      if (res.data && res.data.data) {
        const prodList = res.data.data.products || res.data.data;
        if (Array.isArray(prodList)) setProducts(prodList);
      }
    } catch (err) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setMessage({ type: 'error', text: 'Please select a product for recurring delivery' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const res = await api.post('/subscriptions', {
        productId: selectedProduct,
        quantity: parseInt(quantity, 10),
        frequency
      });

      if (res.data && res.data.success) {
        setMessage({ type: 'success', text: 'Grocery subscription created successfully!' });
        setShowModal(false);
        setSelectedProduct('');
        setQuantity(1);
        fetchSubscriptions();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create subscription' });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePause = async (id, currentStatus) => {
    try {
      const endpoint = currentStatus === 'ACTIVE' ? `/subscriptions/${id}/pause` : `/subscriptions/${id}/resume`;
      const res = await api.post(endpoint);
      if (res.data && res.data.success) {
        fetchSubscriptions();
      }
    } catch (err) {
      alert('Failed to update subscription status');
    }
  };

  const handleSkip = async (id) => {
    if (!window.confirm('Skip the next upcoming delivery for this subscription?')) return;
    try {
      const res = await api.post(`/subscriptions/${id}/skip`);
      if (res.data && res.data.success) {
        alert('Next delivery skipped successfully!');
        fetchSubscriptions();
      }
    } catch (err) {
      alert('Failed to skip delivery');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this recurring subscription?')) return;
    try {
      const res = await api.post(`/subscriptions/${id}/cancel`);
      if (res.data && res.data.success) {
        fetchSubscriptions();
      }
    } catch (err) {
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p>Loading Grocery Subscriptions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🥛</span> Smart Grocery Subscriptions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Setup recurring daily/weekly delivery for Kirana staples like Milk, Bread, Atta & Eggs.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm w-fit"
        >
          + Setup New Subscription
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${
          message.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="font-bold">✕</button>
        </div>
      )}

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold text-slate-700 text-lg">No Active Grocery Subscriptions</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Never run out of daily staples! Schedule automated morning deliveries directly to your doorstep.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl shadow-sm"
          >
            Create Your First Subscription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                    sub.status === 'PAUSED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {sub.status}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 mt-2">
                    {sub.products?.name || 'Grocery Staple Item'}
                  </h3>
                  <p className="text-xs text-slate-500">Frequency: <strong className="text-slate-700">{sub.frequency}</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-blue-600">Qty: {sub.quantity}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 mb-6 flex justify-between items-center text-xs text-slate-600">
                <span>Next Scheduled Delivery:</span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  📅 {sub.next_delivery_date}
                </span>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                {sub.status !== 'CANCELLED' && (
                  <>
                    <button
                      onClick={() => togglePause(sub.id, sub.status)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {sub.status === 'ACTIVE' ? '⏸️ Pause' : '▶️ Resume'}
                    </button>

                    <button
                      onClick={() => handleSkip(sub.id)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      ⏭️ Skip Next
                    </button>

                    <button
                      onClick={() => handleCancel(sub.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors ml-auto"
                    >
                      ✕ Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Subscription Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Setup Grocery Subscription</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Grocery Staple</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price || p.price})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity per Delivery</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  <option value="DAILY">Everyday Daily</option>
                  <option value="ALTERNATE_DAYS">Alternate Days</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Activate Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrocerySubscriptionsPage;
