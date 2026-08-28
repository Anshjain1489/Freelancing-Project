const supabase = require('../config/supabase');
const { AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../constants/statusCodes');

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000002';

const storeConfigurationService = {
  /**
   * Fetch public store branding & configuration for frontend UI initialization.
   */
  getPublicConfiguration: async (storeId = DEFAULT_STORE_ID) => {
    let branding = {
      store_name: 'Chaudhary Kirana Store',
      logo_url: '/assets/logo.png',
      favicon_url: '/favicon.ico',
      primary_color: '#06C167',
      secondary_color: '#1F2937',
      accent_color: '#FF6B00',
      website_title: 'Chaudhary Kirana Store — Fresh Groceries & Daily Needs',
      meta_description: 'Order fresh groceries, staples, dairy, personal care, and household items online.',
      support_email: 'support@chaudharykiranastore.com',
      support_phone: '+91 7897837095',
      footer_text: '© 2026 Chaudhary Kirana Store. All rights reserved.'
    };

    let settings = {
      delivery_enabled: true,
      pos_enabled: true,
      online_orders_enabled: true,
      guest_checkout_enabled: true,
      maintenance_mode: false,
      minimum_order_amount: 99.00
    };

    if (supabase) {
      const { data: brandData } = await supabase
        .from('store_branding')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

      if (brandData) {
        branding = { ...branding, ...brandData };
      }

      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('key, setting_key, value, setting_value, is_sensitive')
        .eq('store_id', storeId);

      if (settingsData && settingsData.length > 0) {
        for (const s of settingsData) {
          if (!s.is_sensitive) {
            const k = s.setting_key || s.key;
            const v = s.setting_value !== undefined ? s.setting_value : s.value;
            settings[k] = v;
          }
        }
      }
    }

    return {
      storeId,
      branding,
      settings
    };
  },

  /**
   * Fetch complete admin store configuration.
   */
  getAdminConfiguration: async (storeId = DEFAULT_STORE_ID) => {
    const publicConfig = await storeConfigurationService.getPublicConfiguration(storeId);
    let storeDetails = {
      name: 'Chaudhary Kirana Store',
      store_code: 'CKS-MAIN',
      phone: '7897837095',
      email: 'contact@chaudharykiranastore.com',
      address: 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni',
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    };

    if (supabase) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();

      if (storeData) {
        storeDetails = { ...storeDetails, ...storeData };
      }
    }

    return {
      ...publicConfig,
      storeDetails
    };
  },

  /**
   * Update store branding colors, logo, titles.
   */
  updateBranding: async (storeId = DEFAULT_STORE_ID, brandingPayload = {}) => {
    // Validate hex colors if provided
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (brandingPayload.primary_color && !hexRegex.test(brandingPayload.primary_color)) {
      throw new AppError('Invalid primary_color hex format (e.g. #06C167)', HTTP_STATUS.BAD_REQUEST);
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('store_branding')
        .upsert({
          store_id: storeId,
          ...brandingPayload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' })
        .select()
        .single();

      if (error) throw new AppError(`Failed to update store branding: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return data;
    }

    return brandingPayload;
  },

  /**
   * Update individual store setting.
   */
  updateSetting: async (storeId = DEFAULT_STORE_ID, settingKey, settingValue, isSensitive = false, userId = null) => {
    if (!settingKey) throw new AppError('setting_key is required', HTTP_STATUS.BAD_REQUEST);

    if (supabase) {
      const { data, error } = await supabase
        .from('store_settings')
        .upsert({
          store_id: storeId,
          key: settingKey,
          setting_key: settingKey,
          setting_value: settingValue,
          value: typeof settingValue === 'string' ? settingValue : JSON.stringify(settingValue),
          is_sensitive: isSensitive,
          updated_by: userId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
        .select()
        .single();

      if (error) throw new AppError(`Failed to update store setting: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return data;
    }

    return { settingKey, settingValue };
  }
};

module.exports = storeConfigurationService;
