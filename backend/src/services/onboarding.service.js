const storeConfigurationService = require('./storeConfiguration.service');
const featureFlagService = require('./featureFlag.service');
const supabase = require('../config/supabase');

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000002';

const onboardingService = {
  /**
   * Get onboarding wizard progress and completion state.
   */
  getOnboardingStatus: async (storeId = DEFAULT_STORE_ID) => {
    const config = await storeConfigurationService.getAdminConfiguration(storeId);
    
    // Check product count
    let productCount = 0;
    if (supabase) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true });
      productCount = count || 0;
    }

    const steps = [
      {
        step: 1,
        key: 'business_details',
        title: 'Business Details',
        completed: Boolean(config.storeDetails.name && config.storeDetails.phone),
        details: { storeName: config.storeDetails.name, phone: config.storeDetails.phone }
      },
      {
        step: 2,
        key: 'branding',
        title: 'Store Branding',
        completed: Boolean(config.branding.store_name && config.branding.primary_color),
        details: { storeName: config.branding.store_name, primaryColor: config.branding.primary_color }
      },
      {
        step: 3,
        key: 'operational_setup',
        title: 'Operational Setup',
        completed: Boolean(config.settings.delivery_enabled !== undefined),
        details: { deliveryEnabled: config.settings.delivery_enabled, posEnabled: config.settings.pos_enabled }
      },
      {
        step: 4,
        key: 'admin_setup',
        title: 'Admin Account & Security',
        completed: true,
        details: { adminRoleVerified: true }
      },
      {
        step: 5,
        key: 'catalog_setup',
        title: 'Catalog & Inventory Setup',
        completed: productCount > 0,
        details: { productCount }
      },
      {
        step: 6,
        key: 'go_live_checklist',
        title: 'Go-Live Checklist',
        completed: productCount > 0 && Boolean(config.storeDetails.name),
        details: { readyForGoLive: productCount > 0 }
      }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const progressPct = Math.round((completedCount / steps.length) * 100);

    return {
      storeId,
      progressPct,
      isFullyOnboarded: completedCount === steps.length,
      steps
    };
  }
};

module.exports = onboardingService;
