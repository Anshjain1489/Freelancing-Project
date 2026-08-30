import React from 'react';
import { useNavigate } from 'react-router-dom';

const MyOffersPage = () => {
  const navigate = useNavigate();

  const activeOffers = [
    {
      id: 'off-1',
      title: 'Welcome Back Bonus Discount',
      code: 'WELCOME10',
      discount: '10% OFF',
      description: 'Get 10% instant discount on your next grocery order above ₹500.',
      expiry: 'Valid till 30 Sep 2026',
      tag: 'PERSONALIZED'
    },
    {
      id: 'off-2',
      title: 'Udhar Khata Special Cashback',
      code: 'KHATA50',
      discount: '₹50 CASHBACK',
      description: 'Clear your Udhar balance via UPI & get ₹50 store credit bonus.',
      expiry: 'Valid till 15 Sep 2026',
      tag: 'UDHAR SPECIAL'
    },
    {
      id: 'off-3',
      title: 'VIP Loyalty Multiplier (2.0x)',
      code: 'LOYALTYVIP',
      discount: 'DOUBLE POINTS',
      description: 'Earn 2x Loyalty Points on all fresh staple purchases this week.',
      expiry: 'Valid till 07 Sep 2026',
      tag: 'VIP REWARD'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>🏷️</span> My Exclusive Coupons & Personalized Offers
          </h1>
          <p className="text-amber-100 text-sm mt-1">
            Exclusive deals tailored for your Kirana store shopping history. Apply codes at checkout!
          </p>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="px-5 py-2.5 bg-white text-orange-700 hover:bg-amber-50 font-bold text-sm rounded-xl transition-colors shadow-sm"
        >
          🛒 Shop Now & Apply
        </button>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeOffers.map((offer) => (
          <div key={offer.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  {offer.tag}
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg">
                  {offer.discount}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">{offer.title}</h3>
              <p className="text-xs text-slate-600 mt-2">{offer.description}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Promo Code</p>
                <p className="text-sm font-mono font-extrabold text-slate-900">{offer.code}</p>
              </div>
              <span className="text-[11px] text-slate-400">{offer.expiry}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOffersPage;
