const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const mockEvents = new Map();
const mockPreferences = new Map();

const SENSITIVE_KEYS = ['password', 'jwt', 'token', 'secret', 'card_number', 'cvv', 'authorization'];

/**
 * Sanitize event metadata to ensure no sensitive credentials are logged
 */
const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object') return {};
  const clean = { ...metadata };
  Object.keys(clean).forEach(k => {
    if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
      delete clean[k];
    }
  });
  return clean;
};

/**
 * Log structured engagement event
 */
const logEvent = async (eventData) => {
  const { userId, sessionId, eventType, productId, orderId, campaignId, metadata = {} } = eventData;
  if (!eventType) throw new AppError('Event type is required', HTTP_STATUS.BAD_REQUEST);

  const cleanMeta = sanitizeMetadata(metadata);
  const record = {
    id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId || null,
    session_id: sessionId || null,
    event_type: eventType,
    product_id: productId || null,
    order_id: orderId || null,
    campaign_id: campaignId || null,
    metadata: cleanMeta,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_engagement_events')
        .insert([{
          user_id: record.user_id,
          session_id: record.session_id,
          event_type: record.event_type,
          product_id: record.product_id,
          order_id: record.order_id,
          campaign_id: record.campaign_id,
          metadata: record.metadata
        }])
        .select()
        .single();
      if (!error && data) {
        mockEvents.set(data.id, data);
        return data;
      }
    } catch (e) {}
  }

  mockEvents.set(record.id, record);
  return record;
};

/**
 * Retrieve customer engagement timeline
 */
const getCustomerTimeline = async (userId, limit = 50) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  let list = Array.from(mockEvents.values()).filter(e => e.user_id === userId);

  if (supabase) {
    try {
      const { data } = await supabase
        .from('customer_engagement_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }

  return { timeline: list.slice(0, limit) };
};

/**
 * Get communication preferences
 */
const getPreferences = async (userId) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  const existing = mockPreferences.get(userId) || {
    user_id: userId,
    whatsapp_enabled: true,
    promotional_notifications_enabled: true,
    email_enabled: true,
    updated_at: new Date().toISOString()
  };
  return existing;
};

/**
 * Update communication preferences
 */
const updatePreferences = async (userId, updates = {}) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  const current = await getPreferences(userId);
  const updated = {
    ...current,
    whatsapp_enabled: updates.whatsappEnabled !== undefined ? updates.whatsappEnabled : current.whatsapp_enabled,
    promotional_notifications_enabled: updates.promotionalNotificationsEnabled !== undefined ? updates.promotionalNotificationsEnabled : current.promotional_notifications_enabled,
    email_enabled: updates.emailEnabled !== undefined ? updates.emailEnabled : current.email_enabled,
    updated_at: new Date().toISOString()
  };

  mockPreferences.set(userId, updated);
  return updated;
};

module.exports = {
  logEvent,
  getCustomerTimeline,
  getPreferences,
  updatePreferences,
  mockEvents,
  mockPreferences
};
