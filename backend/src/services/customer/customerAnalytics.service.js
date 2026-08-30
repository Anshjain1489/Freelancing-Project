const customerCRMService = require('./customerCRM.service');
const abandonedCartService = require('./abandonedCart.service');
const referralService = require('./referral.service');
const marketingCampaignService = require('./marketingCampaign.service');

/**
 * Get Comprehensive Retention, CRM & Growth Analytics Overview
 */
const getOverviewAnalytics = async () => {
  const { profiles, summary: crmSummary } = await customerCRMService.listProfiles({ limit: 5000 });
  const { summary: cartSummary } = await abandonedCartService.listAbandonedCarts();
  const { summary: referralSummary } = await referralService.listReferralsAdmin();

  // Retention Metrics calculation
  const total = profiles.length || 1;
  const activeCount = profiles.filter(p => p.customer_segment === 'ACTIVE_CUSTOMER' || p.customer_segment === 'REPEAT_CUSTOMER' || p.customer_segment === 'HIGH_VALUE').length;
  const repeatCount = profiles.filter(p => (p.completed_orders || 0) >= 2).length;

  const retention30Day = Math.round((activeCount / total) * 10000) / 100;
  const repeatRate = Math.round((repeatCount / total) * 10000) / 100;

  const totalAOV = profiles.reduce((acc, p) => acc + (parseFloat(p.average_order_value) || 0), 0);
  const avgAOV = profiles.length > 0 ? Math.round((totalAOV / profiles.length) * 100) / 100 : 0;

  const totalCLV = profiles.reduce((acc, p) => acc + (parseFloat(p.customer_lifetime_value) || 0), 0);

  return {
    customerGrowth: {
      totalCustomers: crmSummary.totalCustomers,
      totalRevenue: crmSummary.totalRevenue,
      highValueCount: crmSummary.highValueCount,
      atRiskCount: crmSummary.atRiskCount,
      repeatCustomerCount: repeatCount
    },
    retention: {
      retention30DayPercentage: retention30Day,
      repeatPurchaseRatePercentage: repeatRate,
      averageOrderValue: avgAOV,
      totalEstimatedCLV: Math.round(totalCLV * 100) / 100
    },
    abandonedCartRecovery: cartSummary,
    referralProgram: referralSummary
  };
};

module.exports = {
  getOverviewAnalytics
};
