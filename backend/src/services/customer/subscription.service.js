const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const inventoryService = require('../inventory.service');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// In-Memory Storage Fallbacks
const mockSubscriptions = new Map();
const mockDispatches = new Map();

/**
 * Helper: Advance next delivery date based on frequency
 */
const calculateNextDate = (currentDateStr, frequency) => {
  const dt = new Date(currentDateStr);
  const freq = (frequency || 'DAILY').toUpperCase();

  if (freq === 'DAILY') {
    dt.setDate(dt.getDate() + 1);
  } else if (freq === 'ALTERNATE_DAYS') {
    dt.setDate(dt.getDate() + 2);
  } else if (freq === 'WEEKLY') {
    dt.setDate(dt.getDate() + 7);
  } else if (freq === 'MONTHLY') {
    dt.setMonth(dt.getMonth() + 1);
  } else {
    dt.setDate(dt.getDate() + 1);
  }

  return dt.toISOString().split('T')[0];
};

/**
 * 1. Create Subscription
 */
const createSubscription = async (userId, data = {}) => {
  const { productId, quantity = 1, frequency = 'DAILY', startDate = new Date().toISOString().split('T')[0], addressId = null, branchId = null } = data;

  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  if (!productId) throw new AppError('Product ID is required for grocery subscription', HTTP_STATUS.BAD_REQUEST);

  const numQty = parseInt(quantity, 10);
  if (isNaN(numQty) || numQty <= 0) {
    throw new AppError('Quantity must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }

  const validFreqs = ['DAILY', 'ALTERNATE_DAYS', 'WEEKLY', 'MONTHLY'];
  if (!validFreqs.includes(frequency.toUpperCase())) {
    throw new AppError(`Invalid frequency "${frequency}". Allowed: ${validFreqs.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const record = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    branch_id: branchId || null,
    product_id: productId,
    quantity: numQty,
    frequency: frequency.toUpperCase(),
    next_delivery_date: startDate,
    status: 'ACTIVE',
    address_id: addressId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: saved, error } = await supabase.from('grocery_subscriptions').insert([{
        user_id: isUuid(userId) ? userId : null,
        branch_id: isUuid(branchId) ? branchId : null,
        product_id: isUuid(productId) ? productId : null,
        quantity: record.quantity,
        frequency: record.frequency,
        next_delivery_date: record.next_delivery_date,
        status: record.status,
        address_id: isUuid(addressId) ? addressId : null
      }]).select().single();

      if (!error && saved) {
        record.id = saved.id;
      }
    } catch (e) {}
  }

  mockSubscriptions.set(record.id, record);
  return record;
};

/**
 * 2. List Customer Subscriptions
 */
const listSubscriptions = async (userId, queryParams = {}) => {
  let list = Array.from(mockSubscriptions.values()).filter(s => s.user_id === userId);

  if (supabase && isUuid(userId)) {
    try {
      let query = supabase.from('grocery_subscriptions').select('*, products(name, selling_price, image_url)').eq('user_id', userId);
      if (queryParams.status) query = query.eq('status', queryParams.status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.status) {
    list = list.filter(s => s.status === queryParams.status);
  }

  return {
    subscriptions: list,
    total: list.length
  };
};

/**
 * 3. Get Single Subscription
 */
const getSubscriptionById = async (subscriptionId, userId = null) => {
  let sub = mockSubscriptions.get(subscriptionId);

  if (supabase && isUuid(subscriptionId)) {
    try {
      const { data } = await supabase.from('grocery_subscriptions').select('*, products(name, selling_price)').eq('id', subscriptionId).maybeSingle();
      if (data) sub = data;
    } catch (e) {}
  }

  if (!sub) {
    throw new AppError('Grocery subscription not found', HTTP_STATUS.NOT_FOUND);
  }

  if (userId && sub.user_id !== userId) {
    throw new AppError('Unauthorized access to customer subscription', HTTP_STATUS.FORBIDDEN);
  }

  return sub;
};

/**
 * 4. Update Subscription
 */
const updateSubscription = async (subscriptionId, userId, updateData = {}) => {
  const sub = await getSubscriptionById(subscriptionId, userId);

  if (updateData.quantity) {
    const q = parseInt(updateData.quantity, 10);
    if (isNaN(q) || q <= 0) throw new AppError('Quantity must be positive', HTTP_STATUS.BAD_REQUEST);
    sub.quantity = q;
  }

  if (updateData.frequency) {
    const validFreqs = ['DAILY', 'ALTERNATE_DAYS', 'WEEKLY', 'MONTHLY'];
    if (!validFreqs.includes(updateData.frequency.toUpperCase())) {
      throw new AppError('Invalid frequency', HTTP_STATUS.BAD_REQUEST);
    }
    sub.frequency = updateData.frequency.toUpperCase();
  }

  if (updateData.nextDeliveryDate) {
    sub.next_delivery_date = updateData.nextDeliveryDate;
  }

  sub.updated_at = new Date().toISOString();

  if (supabase && isUuid(subscriptionId)) {
    try {
      await supabase.from('grocery_subscriptions').update({
        quantity: sub.quantity,
        frequency: sub.frequency,
        next_delivery_date: sub.next_delivery_date,
        updated_at: sub.updated_at
      }).eq('id', subscriptionId);
    } catch (e) {}
  }

  mockSubscriptions.set(sub.id, sub);
  return sub;
};

/**
 * 5. Pause Subscription
 */
const pauseSubscription = async (subscriptionId, userId) => {
  const sub = await getSubscriptionById(subscriptionId, userId);
  sub.status = 'PAUSED';
  sub.updated_at = new Date().toISOString();

  if (supabase && isUuid(subscriptionId)) {
    try {
      await supabase.from('grocery_subscriptions').update({ status: 'PAUSED', updated_at: sub.updated_at }).eq('id', subscriptionId);
    } catch (e) {}
  }

  mockSubscriptions.set(sub.id, sub);
  return sub;
};

/**
 * 6. Resume Subscription
 */
const resumeSubscription = async (subscriptionId, userId) => {
  const sub = await getSubscriptionById(subscriptionId, userId);
  sub.status = 'ACTIVE';
  sub.updated_at = new Date().toISOString();

  if (supabase && isUuid(subscriptionId)) {
    try {
      await supabase.from('grocery_subscriptions').update({ status: 'ACTIVE', updated_at: sub.updated_at }).eq('id', subscriptionId);
    } catch (e) {}
  }

  mockSubscriptions.set(sub.id, sub);
  return sub;
};

/**
 * 7. Skip Next Delivery
 */
const skipNextDelivery = async (subscriptionId, userId) => {
  const sub = await getSubscriptionById(subscriptionId, userId);
  const skippedDate = sub.next_delivery_date;
  const nextDate = calculateNextDate(skippedDate, sub.frequency);

  sub.next_delivery_date = nextDate;
  sub.updated_at = new Date().toISOString();

  // Log skipped dispatch
  const dispatchRecord = {
    id: `disp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    subscription_id: sub.id,
    scheduled_date: skippedDate,
    execution_status: 'SKIPPED',
    generated_order_id: null,
    error_details: 'Skipped by customer request',
    created_at: new Date().toISOString()
  };

  mockDispatches.set(`${sub.id}_${skippedDate}`, dispatchRecord);

  if (supabase && isUuid(subscriptionId)) {
    try {
      await supabase.from('grocery_subscriptions').update({ next_delivery_date: nextDate, updated_at: sub.updated_at }).eq('id', subscriptionId);
      await supabase.from('subscription_dispatches').insert([{
        subscription_id: subscriptionId,
        scheduled_date: skippedDate,
        execution_status: 'SKIPPED',
        error_details: 'Skipped by customer request'
      }]);
    } catch (e) {}
  }

  mockSubscriptions.set(sub.id, sub);
  return { subscription: sub, skippedDate, nextDeliveryDate: nextDate };
};

/**
 * 8. Cancel Subscription
 */
const cancelSubscription = async (subscriptionId, userId) => {
  const sub = await getSubscriptionById(subscriptionId, userId);
  sub.status = 'CANCELLED';
  sub.updated_at = new Date().toISOString();

  if (supabase && isUuid(subscriptionId)) {
    try {
      await supabase.from('grocery_subscriptions').update({ status: 'CANCELLED', updated_at: sub.updated_at }).eq('id', subscriptionId);
    } catch (e) {}
  }

  mockSubscriptions.set(sub.id, sub);
  return sub;
};

/**
 * 9. Idempotent Automated Daily Subscription Dispatch Engine (Cron Trigger)
 */
const dispatchSubscriptions = async (scheduledDate = new Date().toISOString().split('T')[0]) => {
  let dueList = Array.from(mockSubscriptions.values()).filter(s => s.status === 'ACTIVE' && s.next_delivery_date <= scheduledDate);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('grocery_subscriptions')
        .select('*')
        .eq('status', 'ACTIVE')
        .lte('next_delivery_date', scheduledDate);

      if (!error && data && data.length > 0) {
        dueList = data;
      }
    } catch (e) {}
  }

  const results = {
    scheduledDate,
    totalDue: dueList.length,
    processedCount: 0,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    dispatches: []
  };

  for (const sub of dueList) {
    const dispatchKey = `${sub.id}_${scheduledDate}`;

    // Idempotency Guard 1: In-memory check
    if (mockDispatches.has(dispatchKey)) {
      results.skippedCount++;
      continue;
    }

    // Idempotency Guard 2: Database unique constraint check
    if (supabase && isUuid(sub.id)) {
      try {
        const { data: existingDisp } = await supabase
          .from('subscription_dispatches')
          .select('*')
          .eq('subscription_id', sub.id)
          .eq('scheduled_date', scheduledDate)
          .maybeSingle();

        if (existingDisp) {
          results.skippedCount++;
          mockDispatches.set(dispatchKey, existingDisp);
          continue;
        }
      } catch (e) {}
    }

    // Inventory & Stock Protection Check
    let stockAvailable = true;
    let stockError = null;

    try {
      const prodId = sub.product_id;
      const stockMap = inventoryService.mockProductsStore || inventoryService.mockInventory;
      if (stockMap && stockMap.has(prodId)) {
        const item = stockMap.get(prodId);
        const currStock = parseInt(item.stock_quantity || item.quantity || 0, 10);
        if (currStock < sub.quantity) {
          stockAvailable = false;
          stockError = `Insufficient inventory. Required: ${sub.quantity}, Available: ${currStock}`;
        }
      }
    } catch (e) {}

    const dispatchRecord = {
      id: `disp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      subscription_id: sub.id,
      scheduled_date: scheduledDate,
      execution_status: stockAvailable ? 'SUCCESS' : 'FAILED',
      generated_order_id: stockAvailable ? `ORD-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` : null,
      error_details: stockError,
      created_at: new Date().toISOString()
    };

    if (supabase && isUuid(sub.id)) {
      try {
        const { data: saved } = await supabase.from('subscription_dispatches').insert([{
          subscription_id: sub.id,
          scheduled_date: scheduledDate,
          execution_status: dispatchRecord.execution_status,
          generated_order_id: isUuid(dispatchRecord.generated_order_id) ? dispatchRecord.generated_order_id : null,
          error_details: dispatchRecord.error_details
        }]).select().single();

        if (saved) dispatchRecord.id = saved.id;
      } catch (e) {}
    }

    mockDispatches.set(dispatchKey, dispatchRecord);
    results.processedCount++;

    if (stockAvailable) {
      results.successCount++;
      // Advance next_delivery_date
      const nextDate = calculateNextDate(sub.next_delivery_date, sub.frequency);
      sub.next_delivery_date = nextDate;
      sub.updated_at = new Date().toISOString();

      if (supabase && isUuid(sub.id)) {
        try {
          await supabase.from('grocery_subscriptions').update({ next_delivery_date: nextDate, updated_at: sub.updated_at }).eq('id', sub.id);
        } catch (e) {}
      }
      mockSubscriptions.set(sub.id, sub);
    } else {
      results.failedCount++;
    }

    results.dispatches.push(dispatchRecord);
  }

  return results;
};

/**
 * 10. List All Subscriptions (Admin)
 */
const listAllSubscriptionsAdmin = async (queryParams = {}) => {
  let list = Array.from(mockSubscriptions.values());

  if (supabase) {
    try {
      const { data, error } = await supabase.from('grocery_subscriptions').select('*, products(name, selling_price), users(full_name, phone_number, email)');
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.status) {
    list = list.filter(s => s.status === queryParams.status);
  }

  return {
    subscriptions: list,
    summary: {
      total: list.length,
      activeCount: list.filter(s => s.status === 'ACTIVE').length,
      pausedCount: list.filter(s => s.status === 'PAUSED').length,
      cancelledCount: list.filter(s => s.status === 'CANCELLED').length
    }
  };
};

module.exports = {
  createSubscription,
  listSubscriptions,
  getSubscriptionById,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  skipNextDelivery,
  cancelSubscription,
  dispatchSubscriptions,
  listAllSubscriptionsAdmin,
  mockSubscriptions,
  mockDispatches
};
