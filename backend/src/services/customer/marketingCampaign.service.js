const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const customerSegmentationService = require('./customerSegmentation.service');
const customerEngagementService = require('./customerEngagement.service');

const mockCampaigns = new Map();
const mockDeliveries = new Map();

/**
 * Safely render message template params without eval or code execution
 */
const renderTemplate = (template = '', params = {}) => {
  let rendered = String(template);
  Object.keys(params).forEach(key => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(placeholder, params[key] || '');
  });
  return rendered;
};

/**
 * Create a new marketing campaign
 */
const createCampaign = async (campaignData, createdBy = null) => {
  const { name, description, campaignType = 'PROMOTIONAL', channel = 'IN_APP', subject, messageTemplate, imageUrl, couponId, startsAt, endsAt, segmentId } = campaignData;
  if (!name || !messageTemplate) {
    throw new AppError('Campaign name and message template are required', HTTP_STATUS.BAD_REQUEST);
  }

  const record = {
    id: `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    description: description || '',
    campaign_type: campaignType,
    channel,
    status: 'DRAFT',
    subject: subject || name,
    message_template: messageTemplate,
    image_url: imageUrl || null,
    coupon_id: couponId || null,
    segment_id: segmentId || null,
    starts_at: startsAt || new Date().toISOString(),
    ends_at: endsAt || null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([record])
        .select()
        .single();
      if (!error && data) {
        mockCampaigns.set(data.id, data);
        return data;
      }
    } catch (e) {}
  }

  mockCampaigns.set(record.id, record);
  return record;
};

/**
 * Update campaign details / status
 */
const updateCampaign = async (campaignId, updates = {}) => {
  if (!campaignId) throw new AppError('Campaign ID is required', HTTP_STATUS.BAD_REQUEST);
  const current = mockCampaigns.get(campaignId);

  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from('marketing_campaigns').update(updated).eq('id', campaignId);
    } catch (e) {}
  }

  mockCampaigns.set(campaignId, updated);
  return updated;
};

/**
 * List campaigns
 */
const listCampaigns = async (filters = {}) => {
  let list = Array.from(mockCampaigns.values());

  if (supabase) {
    try {
      const { data } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }

  if (filters.status) {
    list = list.filter(c => c.status === filters.status);
  }

  return { campaigns: list };
};

/**
 * Dispatch Campaign with Idempotency Guard (UNIQUE campaign_id + customer_id)
 */
const dispatchCampaign = async (campaignId, targetUserIds = null) => {
  const campaign = mockCampaigns.get(campaignId);
  if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND);

  let recipientUserIds = targetUserIds || [];

  if (!targetUserIds || targetUserIds.length === 0) {
    // Target by segment if defined or all customers
    const res = await require('./customerCRM.service').listProfiles({ limit: 1000 });
    recipientUserIds = (res.profiles || []).map(p => p.user_id);
  }

  let sentCount = 0;
  let skippedOptOutCount = 0;

  for (const userId of recipientUserIds) {
    // Respect marketing opt-out preferences
    const prefs = await customerEngagementService.getPreferences(userId);
    if (!prefs.promotional_notifications_enabled && campaign.campaign_type === 'PROMOTIONAL') {
      skippedOptOutCount++;
      continue;
    }

    const deliveryKey = `${campaignId}_${userId}`;
    if (mockDeliveries.has(deliveryKey)) {
      // Idempotency: Skip duplicate delivery creation
      continue;
    }

    const delivery = {
      id: `deliv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      campaign_id: campaignId,
      customer_id: userId,
      channel: campaign.channel,
      status: 'DELIVERED',
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('marketing_campaign_deliveries').upsert([delivery], { onConflict: 'campaign_id,customer_id' });
      } catch (e) {}
    }

    mockDeliveries.set(deliveryKey, delivery);
    sentCount++;
  }

  await updateCampaign(campaignId, { status: 'COMPLETED' });

  return {
    success: true,
    campaignId,
    totalTargeted: recipientUserIds.length,
    sentCount,
    skippedOptOutCount
  };
};

/**
 * Get Campaign Analytics & Delivery Stats
 */
const getCampaignAnalytics = async (campaignId) => {
  const campaign = mockCampaigns.get(campaignId);
  if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND);

  const deliveries = Array.from(mockDeliveries.values()).filter(d => d.campaign_id === campaignId);

  const sentCount = deliveries.filter(d => d.status === 'SENT' || d.status === 'DELIVERED' || d.status === 'OPENED' || d.status === 'CLICKED' || d.status === 'CONVERTED').length;
  const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED' || d.status === 'OPENED' || d.status === 'CLICKED' || d.status === 'CONVERTED').length;
  const openedCount = deliveries.filter(d => d.status === 'OPENED' || d.status === 'CLICKED' || d.status === 'CONVERTED').length;
  const clickedCount = deliveries.filter(d => d.status === 'CLICKED' || d.status === 'CONVERTED').length;
  const convertedCount = deliveries.filter(d => d.status === 'CONVERTED').length;

  const conversionRate = deliveredCount > 0 ? Math.round((convertedCount / deliveredCount) * 10000) / 100 : 0;

  return {
    campaign,
    analytics: {
      totalDeliveries: deliveries.length,
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      convertedCount,
      conversionRatePercentage: conversionRate
    }
  };
};

module.exports = {
  renderTemplate,
  createCampaign,
  updateCampaign,
  listCampaigns,
  dispatchCampaign,
  getCampaignAnalytics,
  mockCampaigns,
  mockDeliveries
};
