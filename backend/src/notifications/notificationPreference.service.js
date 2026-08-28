const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const mockPreferences = {};
const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

const getPreferences = async (userId) => {
  if (supabase && isUuid(userId)) {
    let { data: pref } = await supabase.from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!pref) {
      const { data: newPref } = await supabase.from('notification_preferences').insert([{
        user_id: userId,
        in_app_orders: true,
        whatsapp_orders: true,
        whatsapp_promotions: false
      }]).select().single();
      pref = newPref;
    }

    return {
      inAppOrders: pref?.in_app_orders ?? true,
      whatsappOrders: pref?.whatsapp_orders ?? true,
      whatsappPromotions: pref?.whatsapp_promotions ?? false
    };
  }

  if (!mockPreferences[userId]) {
    mockPreferences[userId] = {
      inAppOrders: true,
      whatsappOrders: true,
      whatsappPromotions: false
    };
  }

  return mockPreferences[userId];
};

const updatePreferences = async (userId, updateData) => {
  if (supabase && isUuid(userId)) {
    const payload = {};
    if (typeof updateData.inAppOrders === 'boolean') payload.in_app_orders = updateData.inAppOrders;
    if (typeof updateData.whatsappOrders === 'boolean') payload.whatsapp_orders = updateData.whatsappOrders;
    if (typeof updateData.whatsappPromotions === 'boolean') payload.whatsapp_promotions = updateData.whatsappPromotions;

    await supabase.from('notification_preferences').update(payload).eq('user_id', userId);
  } else {
    mockPreferences[userId] = { ...mockPreferences[userId], ...updateData };
  }

  return getPreferences(userId);
};

module.exports = { getPreferences, updatePreferences };
