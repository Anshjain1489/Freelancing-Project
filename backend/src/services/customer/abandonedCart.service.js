const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const customerEngagementService = require('./customerEngagement.service');

const mockAbandonedCarts = new Map();

/**
 * Detect inactive carts (>60 min old with items)
 */
const detectAbandonedCarts = async () => {
  let activeCarts = [];

  if (supabase) {
    try {
      const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('carts')
        .select('id, user_id, updated_at, cart_items(id, quantity, price)')
        .lt('updated_at', sixtyMinsAgo);
      if (data) activeCarts = data;
    } catch (e) {}
  }

  let newlyDetectedCount = 0;

  for (const cart of activeCarts) {
    if (!cart.user_id) continue;
    const existing = Array.from(mockAbandonedCarts.values()).find(ac => ac.cart_id === cart.id);
    if (existing && existing.recovery_status !== 'EXPIRED') continue;

    const items = cart.cart_items || [];
    const itemCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const cartValue = items.reduce((acc, i) => acc + (i.quantity || 1) * (i.price || 100), 0);

    const record = {
      id: `ac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      cart_id: cart.id,
      user_id: cart.user_id,
      detected_at: new Date().toISOString(),
      cart_value: Math.round(cartValue * 100) / 100,
      item_count: itemCount,
      recovery_status: 'DETECTED',
      reminder_count: 0,
      last_reminder_at: null,
      recovered_order_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('abandoned_carts').insert([record]);
      } catch (e) {}
    }

    mockAbandonedCarts.set(record.id, record);
    newlyDetectedCount++;
  }

  return { success: true, newlyDetectedCount };
};

/**
 * Send automated cart recovery reminders (Max 2 reminders per cart)
 */
const sendCartRecoveryReminders = async () => {
  const allCarts = Array.from(mockAbandonedCarts.values());
  let remindersSent = 0;

  for (const ac of allCarts) {
    if (ac.recovery_status === 'RECOVERED' || ac.recovery_status === 'EXPIRED' || ac.reminder_count >= 2) {
      continue; // Respect max 2 reminders rule
    }

    // Check opt-out preference
    const prefs = await customerEngagementService.getPreferences(ac.user_id);
    if (!prefs.promotional_notifications_enabled) continue;

    const now = Date.now();
    const detectedTime = new Date(ac.detected_at).getTime();
    const hoursSinceDetection = (now - detectedTime) / (1000 * 60 * 60);

    let shouldSend = false;
    let nextStatus = ac.recovery_status;

    if (ac.reminder_count === 0 && hoursSinceDetection >= 2) {
      // First reminder after ~2 hours
      shouldSend = true;
      nextStatus = 'REMINDER_1_SENT';
    } else if (ac.reminder_count === 1 && hoursSinceDetection >= 24) {
      // Second reminder after ~24 hours
      shouldSend = true;
      nextStatus = 'REMINDER_2_SENT';
    }

    if (shouldSend) {
      ac.reminder_count += 1;
      ac.recovery_status = nextStatus;
      ac.last_reminder_at = new Date().toISOString();
      ac.updated_at = new Date().toISOString();

      if (supabase) {
        try {
          await supabase.from('abandoned_carts').update(ac).eq('id', ac.id);
        } catch (e) {}
      }

      mockAbandonedCarts.set(ac.id, ac);
      remindersSent++;
    }
  }

  return { success: true, remindersSent };
};

/**
 * Mark cart recovered upon order completion
 */
const markCartRecovered = async (cartId, user_id, orderId) => {
  const ac = Array.from(mockAbandonedCarts.values()).find(c => c.cart_id === cartId || c.user_id === user_id);
  if (!ac) return null;

  ac.recovery_status = 'RECOVERED';
  ac.recovered_order_id = orderId;
  ac.updated_at = new Date().toISOString();

  if (supabase) {
    try {
      await supabase.from('abandoned_carts').update(ac).eq('id', ac.id);
    } catch (e) {}
  }

  mockAbandonedCarts.set(ac.id, ac);
  return ac;
};

/**
 * List abandoned carts for Admin
 */
const listAbandonedCarts = async (filters = {}) => {
  let list = Array.from(mockAbandonedCarts.values());

  if (supabase) {
    try {
      const { data } = await supabase.from('abandoned_carts').select('*').order('detected_at', { ascending: false });
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }

  if (filters.status) {
    list = list.filter(c => c.recovery_status === filters.status);
  }

  const totalAbandonedCount = list.length;
  const recoveredCount = list.filter(c => c.recovery_status === 'RECOVERED').length;
  const recoveredRevenue = list.filter(c => c.recovery_status === 'RECOVERED').reduce((acc, c) => acc + parseFloat(c.cart_value || 0), 0);
  const recoveryRate = totalAbandonedCount > 0 ? Math.round((recoveredCount / totalAbandonedCount) * 10000) / 100 : 0;

  return {
    abandonedCarts: list,
    summary: {
      totalAbandonedCount,
      recoveredCount,
      recoveredRevenue: Math.round(recoveredRevenue * 100) / 100,
      recoveryRatePercentage: recoveryRate
    }
  };
};

module.exports = {
  detectAbandonedCarts,
  sendCartRecoveryReminders,
  markCartRecovered,
  listAbandonedCarts,
  mockAbandonedCarts
};
