const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const mockSubscriptions = new Set();

const subscribeToStock = async (userId, productId) => {
  if (!userId || !productId) {
    throw new AppError('User ID and Product ID are required', HTTP_STATUS.BAD_REQUEST);
  }

  const key = `${userId}:${productId}`;

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('stock_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        return { message: 'Already subscribed to restock notifications for this product', isSubscribed: true };
      }

      const { data, error } = await supabase
        .from('stock_notifications')
        .insert([{ user_id: userId, product_id: productId, status: 'PENDING' }])
        .select()
        .single();

      if (!error) {
        return { message: 'Successfully subscribed! You will be notified when this item is back in stock. 🔔', isSubscribed: true };
      }
    } catch (e) {
      // Fallback to memory store
    }
  }

  if (mockSubscriptions.has(key)) {
    return { message: 'Already subscribed to restock notifications for this product', isSubscribed: true };
  }

  mockSubscriptions.add(key);
  return { message: 'Successfully subscribed! You will be notified when this item is back in stock. 🔔', isSubscribed: true };
};

const getSubscriptionStatus = async (userId, productId) => {
  if (!userId || !productId) return { isSubscribed: false };
  const key = `${userId}:${productId}`;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('stock_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (data) return { isSubscribed: true };
    } catch (e) {
      // Fallback to memory
    }
  }

  return { isSubscribed: mockSubscriptions.has(key) };
};

const unsubscribeFromStock = async (userId, productId) => {
  const key = `${userId}:${productId}`;

  if (supabase) {
    try {
      await supabase
        .from('stock_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
    } catch (e) {}
  }

  mockSubscriptions.delete(key);
  return { message: 'Unsubscribed from restock notifications.', isSubscribed: false };
};

module.exports = {
  subscribeToStock,
  getSubscriptionStatus,
  unsubscribeFromStock
};
