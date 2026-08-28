const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

// Memory store fallback
const mockReplenishmentsMap = new Map();

/**
 * 1. Calculate and Generate Customer Replenishment Recommendations
 */
const generateCustomerReplenishments = async (customerId) => {
  if (supabase) {
    // 1. Fetch customer's completed orders
    const { data: orders } = await supabase.from('orders')
      .select('id, created_at, order_items(product_id, product_name)')
      .eq('customer_id', customerId)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: true });

    if (!orders || orders.length < 2) {
      return { count: 0, recommendations: [] };
    }

    // 2. Group purchase timestamps by product
    const productPurchases = {};
    orders.forEach(o => {
      (o.order_items || []).forEach(item => {
        if (!productPurchases[item.product_id]) {
          productPurchases[item.product_id] = { name: item.product_name, dates: [] };
        }
        productPurchases[item.product_id].dates.push(new Date(o.created_at));
      });
    });

    const recommendations = [];

    for (const [prodId, data] of Object.entries(productPurchases)) {
      if (data.dates.length < 2) continue; // Require min 2 historical purchases

      // Calculate average interval between purchases
      let totalIntervalMs = 0;
      for (let i = 1; i < data.dates.length; i++) {
        totalIntervalMs += (data.dates[i].getTime() - data.dates[i - 1].getTime());
      }
      const avgIntervalDays = Math.max(7, Math.round(totalIntervalMs / (data.dates.length - 1) / (1000 * 60 * 60 * 24)));
      const lastPurchasedAt = data.dates[data.dates.length - 1];
      const nextSuggestedAt = new Date(lastPurchasedAt.getTime() + avgIntervalDays * 24 * 60 * 60 * 1000);

      // Check product status & stock
      const { data: prod } = await supabase.from('products').select('stock_quantity, is_active').eq('id', prodId).maybeSingle();
      if (!prod || !prod.is_active || prod.stock_quantity <= 0) continue; // Skip out of stock / inactive

      const id = `replenish-${customerId}-${prodId}`;
      const recRecord = {
        id,
        customer_id: customerId,
        product_id: prodId,
        product_name: data.name,
        purchase_count: data.dates.length,
        estimated_interval_days: avgIntervalDays,
        last_purchased_at: lastPurchasedAt.toISOString(),
        next_suggested_at: nextSuggestedAt.toISOString(),
        status: 'PENDING',
        reminder_count: 0,
        is_opted_out: false,
        updated_at: new Date().toISOString()
      };

      await supabase.from('customer_replenishment_recommendations').upsert([recRecord], { onConflict: 'id' });
      recommendations.push(recRecord);
    }

    return { count: recommendations.length, recommendations };
  }

  // Memory Fallback
  const mockRec = {
    id: `replenish-${customerId}-p100`,
    customer_id: customerId,
    product_id: 'p100',
    product_name: 'Aashirvaad Shuddh Chakki Atta 5kg',
    purchase_count: 3,
    estimated_interval_days: 30,
    last_purchased_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    next_suggested_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PENDING',
    reminder_count: 0,
    is_opted_out: false
  };
  mockReplenishmentsMap.set(mockRec.id, mockRec);
  return { count: 1, recommendations: [mockRec] };
};

/**
 * 2. Get Customer Replenishment Recommendations
 */
const getCustomerReplenishments = async (customerId) => {
  if (supabase) {
    const { data } = await supabase.from('customer_replenishment_recommendations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'PENDING')
      .eq('is_opted_out', false);

    return { recommendations: data || [] };
  }

  return { recommendations: Array.from(mockReplenishmentsMap.values()).filter(r => r.customer_id === customerId && r.status === 'PENDING') };
};

/**
 * 3. Dismiss Customer Replenishment Recommendation
 */
const dismissCustomerReplenishment = async (recommendationId, customerId) => {
  if (supabase) {
    const { data, error } = await supabase.from('customer_replenishment_recommendations')
      .update({ status: 'DISMISSED', updated_at: new Date().toISOString() })
      .eq('id', recommendationId)
      .eq('customer_id', customerId)
      .select()
      .maybeSingle();

    if (error || !data) throw new AppError('Replenishment recommendation not found', HTTP_STATUS.NOT_FOUND);
    return { success: true, recommendation: data };
  }

  if (mockReplenishmentsMap.has(recommendationId)) {
    const item = mockReplenishmentsMap.get(recommendationId);
    if (item.customer_id !== customerId) throw new AppError('Unauthorized to dismiss this recommendation', HTTP_STATUS.FORBIDDEN);
    item.status = 'DISMISSED';
    return { success: true, recommendation: item };
  }

  throw new AppError('Replenishment recommendation not found', HTTP_STATUS.NOT_FOUND);
};

module.exports = {
  generateCustomerReplenishments,
  getCustomerReplenishments,
  dismissCustomerReplenishment
};
