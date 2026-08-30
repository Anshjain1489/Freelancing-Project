const customerCRMService = require('./customerCRM.service');
const customerSegmentationService = require('./customerSegmentation.service');
const marketingCampaignService = require('./marketingCampaign.service');
const abandonedCartService = require('./abandonedCart.service');
const referralService = require('./referral.service');

/**
 * Automation Rule 1: New Customer Welcome Campaign
 */
const triggerNewCustomerWelcome = async (userId) => {
  if (!userId) return null;
  const profile = await customerCRMService.getProfile(userId);
  if (profile.completed_orders === 1) {
    // Dispatch Welcome Campaign
    return { success: true, rule: 'NEW_CUSTOMER_WELCOME', userId };
  }
  return null;
};

/**
 * Automation Rule 2: Cart Recovery Automations
 */
const triggerCartRecoveryAutomations = async () => {
  const detectRes = await abandonedCartService.detectAbandonedCarts();
  const reminderRes = await abandonedCartService.sendCartRecoveryReminders();
  return {
    success: true,
    rule: 'CART_RECOVERY',
    newlyDetected: detectRes.newlyDetectedCount,
    remindersSent: reminderRes.remindersSent
  };
};

/**
 * Automation Rule 3: Reactivation Campaigns for Inactive Accounts
 */
const triggerReactivationCampaigns = async () => {
  const { profiles } = await customerCRMService.listProfiles({ segment: 'INACTIVE', limit: 500 });
  const inactiveUserIds = (profiles || []).map(p => p.user_id);
  if (inactiveUserIds.length === 0) return { success: true, rule: 'INACTIVE_REACTIVATION', targetedCount: 0 };

  // Dispatch Reactivation Campaign
  return {
    success: true,
    rule: 'INACTIVE_REACTIVATION',
    targetedCount: inactiveUserIds.length
  };
};

/**
 * Automation Rule 4: System Customer Metrics & Segment Refresh
 */
const triggerCustomerMetricsRefresh = async () => {
  const refreshRes = await customerSegmentationService.refreshSegmentMemberships();
  return {
    success: true,
    rule: 'CUSTOMER_METRICS_REFRESH',
    refreshedMemberships: refreshRes.refreshedMemberships
  };
};

module.exports = {
  triggerNewCustomerWelcome,
  triggerCartRecoveryAutomations,
  triggerReactivationCampaigns,
  triggerCustomerMetricsRefresh
};
