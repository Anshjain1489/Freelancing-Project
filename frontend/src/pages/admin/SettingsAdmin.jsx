import React from 'react';

export const SettingsAdmin = () => (
  <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>Store & Delivery Settings</h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Store Name</label>
        <input type="text" defaultValue="Chaudhary Kirana Store" style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px' }} />
      </div>

      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Free Delivery Radius (KM)</label>
        <input type="number" defaultValue={1.0} style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px' }} />
      </div>

      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Charge per Extra KM (₹)</label>
        <input type="number" defaultValue={10.0} style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px' }} />
      </div>

      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Owner Phone Numbers</label>
        <input type="text" defaultValue="7897837095, 7007550184" style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', marginTop: '4px' }} />
      </div>
    </div>
  </div>
);
