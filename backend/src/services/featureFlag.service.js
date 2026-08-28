const supabase = require('../config/supabase');
const { AppError } = require('../middleware/error.middleware');
const { HTTP_STATUS } = require('../constants/statusCodes');

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000002';

const DEFAULT_FLAGS = {
  ENABLE_POS: true,
  ENABLE_DELIVERY: true,
  ENABLE_PROCUREMENT: true,
  ENABLE_FINANCE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CHATBOT: true,
  ENABLE_PROMOTIONS: true,
  ENABLE_RETURNS: true
};

const featureFlagService = {
  /**
   * Returns dictionary of active feature flags for a store.
   */
  getStoreFeatures: async (storeId = DEFAULT_STORE_ID) => {
    const features = { ...DEFAULT_FLAGS };

    if (supabase) {
      const { data } = await supabase
        .from('store_feature_flags')
        .select('is_enabled, feature_flags(key)')
        .eq('store_id', storeId);

      if (data && data.length > 0) {
        for (const row of data) {
          if (row.feature_flags && row.feature_flags.key) {
            features[row.feature_flags.key] = row.is_enabled;
          }
        }
      }
    }

    return features;
  },

  /**
   * Checks if a specific feature flag is enabled for a store.
   */
  isEnabled: async (storeId = DEFAULT_STORE_ID, featureKey) => {
    const features = await featureFlagService.getStoreFeatures(storeId);
    return Boolean(features[featureKey]);
  },

  /**
   * Toggle or set feature flag status for a store.
   */
  setStoreFeature: async (storeId = DEFAULT_STORE_ID, featureKey, isEnabled, userId = null) => {
    if (supabase) {
      const { data: flag } = await supabase
        .from('feature_flags')
        .select('id')
        .eq('key', featureKey)
        .single();

      if (!flag) {
        throw new AppError(`Feature flag '${featureKey}' does not exist`, HTTP_STATUS.NOT_FOUND);
      }

      const { data, error } = await supabase
        .from('store_feature_flags')
        .upsert({
          store_id: storeId,
          feature_flag_id: flag.id,
          is_enabled: isEnabled,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new AppError(`Failed to update feature flag: ${error.message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return data;
    }

    return { featureKey, isEnabled };
  }
};

module.exports = featureFlagService;
