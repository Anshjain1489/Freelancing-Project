import React from 'react';
import { IndianRupee, ShoppingBag, AlertTriangle, Users } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Store Performance Overview</h2>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Real-time metrics for Chaudhary Kirana Store, Mahruni</p>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--color-mint)', color: 'var(--color-primary-dark)' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Today's Sales</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>₹8,450</h3>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Pending Orders</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>3 Orders</h3>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Low Stock Alerts</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>2 Items</h3>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#F3E8FF', color: '#9333EA' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>Total Customers</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>142</h3>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Quick Admin Actions</h3>
        <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>
          Use the left sidebar to manage products, categories, stock levels, orders, sales reports, and delivery parameters.
        </p>
      </div>
    </div>
  );
};
