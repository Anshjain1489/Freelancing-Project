const supabase = require('../config/supabase');

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

const subscriptionService = {
  /**
   * Fetch active subscription details for an organization.
   */
  getSubscription: async (organizationId = DEFAULT_ORG_ID) => {
    let sub = {
      status: 'ACTIVE',
      plan: {
        code: 'ENTERPRISE',
        name: 'Kirana Enterprise Plan',
        max_stores: 10,
        max_products: 100000,
        max_users: 100
      }
    };

    if (supabase) {
      const { data } = await supabase
        .from('organization_subscriptions')
        .select('status, subscription_plans(*)')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (data && data.subscription_plans) {
        sub = {
          status: data.status,
          plan: data.subscription_plans
        };
      }
    }

    return sub;
  },

  /**
   * Check if organization has active entitlement.
   */
  checkEntitlement: async (organizationId = DEFAULT_ORG_ID, entitlementKey) => {
    const sub = await subscriptionService.getSubscription(organizationId);
    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') {
      return false;
    }
    return true;
  },

  /**
   * Check resource quantity against plan limits.
   */
  checkLimit: async (organizationId = DEFAULT_ORG_ID, resourceType, currentCount) => {
    const sub = await subscriptionService.getSubscription(organizationId);
    const plan = sub.plan || {};

    if (resourceType === 'stores' && currentCount >= (plan.max_stores || 10)) {
      return false;
    }
    if (resourceType === 'products' && currentCount >= (plan.max_products || 100000)) {
      return false;
    }
    if (resourceType === 'users' && currentCount >= (plan.max_users || 100)) {
      return false;
    }

    return true;
  }
};

module.exports = subscriptionService;
