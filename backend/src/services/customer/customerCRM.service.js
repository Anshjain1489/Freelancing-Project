const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const mockProfiles = new Map();

/**
 * Calculate RFM Score string (e.g. R5F4M5) based on purchase metrics
 */
const calculateRFM = (lastOrderAt, orderCount = 0, totalSpend = 0) => {
  let rScore = 1;
  if (lastOrderAt) {
    const diffDays = Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) rScore = 5;
    else if (diffDays <= 30) rScore = 4;
    else if (diffDays <= 60) rScore = 3;
    else if (diffDays <= 90) rScore = 2;
    else rScore = 1;
  }

  let fScore = 1;
  if (orderCount >= 10) fScore = 5;
  else if (orderCount >= 5) fScore = 4;
  else if (orderCount >= 3) fScore = 3;
  else if (orderCount >= 1) fScore = 2;

  let mScore = 1;
  if (totalSpend >= 10000) mScore = 5;
  else if (totalSpend >= 5000) mScore = 4;
  else if (totalSpend >= 2000) mScore = 3;
  else if (totalSpend >= 500) mScore = 2;

  return `R${rScore}F${fScore}M${mScore}`;
};

/**
 * Server-side Estimated Customer Lifetime Value calculation
 * Formula: CLV = AOV * (OrdersPerMonth * 12 * EstimatedLifetimeYears)
 */
const calculateCLV = (aov = 0, firstOrderAt, totalOrders = 0) => {
  if (!firstOrderAt || totalOrders === 0 || aov === 0) return 0;
  const monthsActive = Math.max(1, Math.ceil((Date.now() - new Date(firstOrderAt).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const ordersPerMonth = totalOrders / monthsActive;
  const estimatedYears = 3;
  return Math.round(aov * ordersPerMonth * 12 * estimatedYears * 100) / 100;
};

/**
 * Generate unique customer code (CKS-CUST-XXXXXX)
 */
const generateCustomerCode = (userId) => {
  const shortId = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase() || Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CKS-CUST-${shortId}`;
};

/**
 * Aggregate order data and update customer profile
 */
const syncCustomerProfile = async (userId) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  let orders = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, total_amount, order_status, created_at')
        .eq('user_id', userId);
      if (data) orders = data;
    } catch (e) {}
  }

  const completed = orders.filter(o => o.order_status === 'DELIVERED' || o.order_status === 'COMPLETED');
  const totalOrders = orders.length;
  const completedOrdersCount = completed.length;
  const totalSpend = completed.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);
  const aov = completedOrdersCount > 0 ? Math.round((totalSpend / completedOrdersCount) * 100) / 100 : 0;

  const sorted = [...orders].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const firstOrderAt = sorted.length > 0 ? sorted[0].created_at : null;
  const lastOrderAt = sorted.length > 0 ? sorted[sorted.length - 1].created_at : null;

  const rfmScore = calculateRFM(lastOrderAt, completedOrdersCount, totalSpend);
  const clv = calculateCLV(aov, firstOrderAt, completedOrdersCount);

  let segment = 'NEW_CUSTOMER';
  if (totalSpend >= 10000) segment = 'HIGH_VALUE';
  else if (completedOrdersCount >= 2) segment = 'REPEAT_CUSTOMER';
  else if (completedOrdersCount === 1) segment = 'ACTIVE_CUSTOMER';

  if (lastOrderAt) {
    const diffDays = Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 60) segment = 'INACTIVE';
    else if (diffDays > 30) segment = 'AT_RISK';
  }

  const customerCode = generateCustomerCode(userId);
  const profileData = {
    user_id: userId,
    customer_code: customerCode,
    first_order_at: firstOrderAt,
    last_order_at: lastOrderAt,
    total_orders: totalOrders,
    completed_orders: completedOrdersCount,
    total_spend: Math.round(totalSpend * 100) / 100,
    average_order_value: aov,
    customer_lifetime_value: clv,
    rfm_score: rfmScore,
    customer_segment: segment,
    is_marketing_eligible: true,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .upsert([profileData], { onConflict: 'user_id' })
        .select()
        .single();
      if (!error && data) {
        mockProfiles.set(userId, data);
        return data;
      }
    } catch (e) {}
  }

  const existing = mockProfiles.get(userId) || { id: `cp-${userId}`, created_at: new Date().toISOString() };
  const updated = { ...existing, ...profileData };
  mockProfiles.set(userId, updated);
  return updated;
};

/**
 * Get customer profile by userId
 */
const getProfile = async (userId) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  let profile = mockProfiles.get(userId);
  if (supabase) {
    try {
      const { data } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) profile = data;
    } catch (e) {}
  }

  if (!profile) {
    profile = await syncCustomerProfile(userId);
  }

  return profile;
};

/**
 * Admin: List customer profiles with filters & pagination
 */
const listProfiles = async (filters = {}) => {
  let list = Array.from(mockProfiles.values());

  if (supabase) {
    try {
      let query = supabase.from('customer_profiles').select('*');
      if (filters.segment) query = query.eq('customer_segment', filters.segment);
      if (filters.search) query = query.ilike('customer_code', `%${filters.search}%`);
      const { data, error } = await query.order('total_spend', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (filters.segment) {
    list = list.filter(p => p.customer_segment === filters.segment);
  }
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    list = list.filter(p => p.customer_code.toLowerCase().includes(q) || p.user_id.toLowerCase().includes(q));
  }

  const page = parseInt(filters.page || 1, 10);
  const limit = parseInt(filters.limit || 50, 10);
  const total = list.length;
  const paginated = list.slice((page - 1) * limit, page * limit);

  // Summary Metrics
  const totalCustomers = list.length;
  const totalRevenue = list.reduce((acc, p) => acc + parseFloat(p.total_spend || 0), 0);
  const highValueCount = list.filter(p => p.customer_segment === 'HIGH_VALUE').length;
  const atRiskCount = list.filter(p => p.customer_segment === 'AT_RISK').length;

  return {
    profiles: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      totalCustomers,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      highValueCount,
      atRiskCount
    }
  };
};

module.exports = {
  calculateRFM,
  calculateCLV,
  syncCustomerProfile,
  getProfile,
  listProfiles,
  mockProfiles
};
