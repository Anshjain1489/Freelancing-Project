import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const storeConfigService = {
  getPublicConfig: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/store-config/public`);
      return response.data?.data || null;
    } catch (err) {
      console.warn('Failed to fetch store configuration, using local defaults:', err);
      return null;
    }
  },

  getAdminConfig: async (token) => {
    const response = await axios.get(`${API_BASE_URL}/admin/store-config`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data?.data || null;
  },

  updateBranding: async (token, brandingPayload) => {
    const response = await axios.put(`${API_BASE_URL}/admin/store-config/branding`, brandingPayload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  updateSetting: async (token, settingKey, settingValue) => {
    const response = await axios.put(`${API_BASE_URL}/admin/store-config/settings`, {
      setting_key: settingKey,
      setting_value: settingValue
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  toggleFeatureFlag: async (token, featureKey, isEnabled) => {
    const response = await axios.put(`${API_BASE_URL}/admin/store-config/feature-flags`, {
      feature_key: featureKey,
      is_enabled: isEnabled
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
