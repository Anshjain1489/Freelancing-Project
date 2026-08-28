import React, { useState, useEffect } from 'react';
import { Palette, Store, Settings, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight, Save, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { storeConfigService } from '../../services/storeConfig.service';

export const StoreConfigurationPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({
    store_name: 'Chaudhary Kirana Store',
    primary_color: '#06C167',
    secondary_color: '#1F2937',
    accent_color: '#FF6B00',
    website_title: 'Chaudhary Kirana Store — Fresh Groceries & Daily Needs',
    support_email: 'support@chaudharykiranastore.com',
    support_phone: '+91 7897837095',
    footer_text: '© 2026 Chaudhary Kirana Store. All rights reserved.'
  });

  const [featureFlags, setFeatureFlags] = useState({
    ENABLE_POS: true,
    ENABLE_DELIVERY: true,
    ENABLE_PROCUREMENT: true,
    ENABLE_FINANCE: true,
    ENABLE_ANALYTICS: true,
    ENABLE_CHATBOT: true,
    ENABLE_PROMOTIONS: true,
    ENABLE_RETURNS: true
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await storeConfigService.getAdminConfig(token);
      if (data) {
        if (data.branding) setBranding(prev => ({ ...prev, ...data.branding }));
        if (data.featureFlags) setFeatureFlags(data.featureFlags);
      }
    } catch (err) {
      toast.error('Failed to load store configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await storeConfigService.updateBranding(token, branding);
      toast.success('Store branding updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFlag = async (key) => {
    const nextVal = !featureFlags[key];
    setFeatureFlags(prev => ({ ...prev, [key]: nextVal }));
    try {
      await storeConfigService.toggleFeatureFlag(token, key, nextVal);
      toast.success(`Feature '${key}' updated`);
    } catch (err) {
      setFeatureFlags(prev => ({ ...prev, [key]: !nextVal }));
      toast.error('Failed to toggle feature flag');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" color="#06C167" />
        <p style={{ marginTop: '12px', color: '#6B7280' }}>Loading Store Configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>
            Store Configuration & White-Label Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px' }}>
            Customize store identity, theme colors, branding, and enable/disable system modules.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Branding & Theme Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Palette color="#06C167" size={20} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Branding & Theme Settings</h2>
          </div>

          <form onSubmit={handleSaveBranding}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Store Name
              </label>
              <input
                type="text"
                value={branding.store_name}
                onChange={(e) => setBranding({ ...branding, store_name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Primary Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={branding.primary_color}
                    onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Secondary Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={branding.secondary_color}
                    onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Accent Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="color"
                    value={branding.accent_color}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    style={{ width: '36px', height: '36px', border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={branding.accent_color}
                    onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Website Meta Title
              </label>
              <input
                type="text"
                value={branding.website_title}
                onChange={(e) => setBranding({ ...branding, website_title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Support Email
                </label>
                <input
                  type="email"
                  value={branding.support_email}
                  onChange={(e) => setBranding({ ...branding, support_email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Support Phone
                </label>
                <input
                  type="text"
                  value={branding.support_phone}
                  onChange={(e) => setBranding({ ...branding, support_phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#06C167',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Branding Changes'}</span>
            </button>
          </form>
        </div>

        {/* Feature Flags Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Settings color="#06C167" size={20} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Module Feature Flags</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.keys(featureFlags).map((key) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1F2937' }}>{key}</span>
                </div>
                <button
                  onClick={() => handleToggleFlag(key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {featureFlags[key] ? (
                    <ToggleRight size={32} color="#06C167" />
                  ) : (
                    <ToggleLeft size={32} color="#9CA3AF" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreConfigurationPage;
