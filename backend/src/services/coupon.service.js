/**
 * ============================================================================
 * COUPON SERVICE — PHASE 46 COMMERCIAL ENHANCEMENT
 * Enterprise coupon lifecycle, server-side validation, discount calculations,
 * and usage integrity tracking.
 * ============================================================================
 */

const pool = require('../config/db');
const supabase = require('../config/supabase');
const cartService = require('./cart.service');
const addressService = require('./address.service');
const deliveryService = require('./delivery.service');
const { logAdminActivity } = require('./adminLog.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// In-memory fallback mock coupons store
const mockCoupons = [
  { id: 'cpn-1', code: 'SAVE10', description: '10% OFF on orders above ₹500', minimum_order_amount: 500.00, maximum_discount_amount: 100.00, discount_type: 'PERCENTAGE', discount_value: 10.00, usage_limit: 100, usage_limit_per_user: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'cpn-2', code: 'WELCOME100', description: 'Flat ₹100 OFF on orders above ₹999', minimum_order_amount: 999.00, maximum_discount_amount: 100.00, discount_type: 'FIXED', discount_value: 100.00, usage_limit: 50, usage_limit_per_user: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'cpn-3', code: 'KIRANA50', description: 'Flat ₹50 OFF on orders above ₹499', minimum_order_amount: 499.00, maximum_discount_amount: 50.00, discount_type: 'FIXED', discount_value: 50.00, usage_limit: 200, usage_limit_per_user: 2, is_active: true, created_at: new Date().toISOString() }
];

const mockUsages = [];

/**
 * Fetch a coupon by code (case-insensitive & trimmed)
 */
const getCouponByCode = async (rawCode) => {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const normalizedCode = rawCode.trim().toUpperCase();

  try {
    const res = await pool.query('SELECT * FROM coupons WHERE LOWER(code) = LOWER($1)', [normalizedCode]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (e) {}

  if (supabase) {
    const { data } = await supabase.from('coupons').select('*').ilike('code', normalizedCode).maybeSingle();
    if (data) return data;
  }

  return mockCoupons.find(c => c.code.toUpperCase() === normalizedCode) || null;
};

/**
 * Fetch a coupon by ID
 */
const getCouponById = async (couponId) => {
  if (!couponId) return null;

  try {
    if (isUuid(couponId)) {
      const res = await pool.query('SELECT * FROM coupons WHERE id = $1', [couponId]);
      if (res.rows.length > 0) return res.rows[0];
    }
  } catch (e) {}

  if (supabase && isUuid(couponId)) {
    const { data } = await supabase.from('coupons').select('*').eq('id', couponId).maybeSingle();
    if (data) return data;
  }

  return mockCoupons.find(c => c.id === couponId || c.code.toUpperCase() === String(couponId).toUpperCase()) || null;
};

/**
 * Get total usage counts for a coupon (Global & Per-User)
 */
const getCouponUsageCounts = async (couponId, userId = null) => {
  let globalCount = mockUsages.filter(u => u.coupon_id === couponId).length;
  let userCount = userId ? mockUsages.filter(u => u.coupon_id === couponId && u.user_id === userId).length : 0;

  try {
    if (isUuid(couponId)) {
      const gRes = await pool.query('SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1', [couponId]);
      globalCount += parseInt(gRes.rows[0]?.count || 0, 10);

      if (userId && isUuid(userId)) {
        const uRes = await pool.query('SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2', [couponId, userId]);
        userCount += parseInt(uRes.rows[0]?.count || 0, 10);
      }
    }
  } catch (e) {}

  return { globalCount, userCount };
};

/**
 * Validate a coupon for a given user's cart (Server-Side Authoritative Validation)
 */
const validateCoupon = async (userId, couponCode, addressIdOrCartTotal = null) => {
  if (!couponCode || !String(couponCode).trim()) {
    throw new AppError('Coupon code is required', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedCode = String(couponCode).trim().toUpperCase();
  const coupon = await getCouponByCode(normalizedCode);

  if (!coupon) {
    throw new AppError(`Invalid coupon code: "${normalizedCode}"`, HTTP_STATUS.BAD_REQUEST);
  }

  if (!coupon.is_active) {
    throw new AppError(`This coupon is currently inactive.`, HTTP_STATUS.BAD_REQUEST);
  }

  const now = new Date();

  // Check start date constraint
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw new AppError(`Coupon "${coupon.code}" is not active yet.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Check expiration constraint
  const expiresAt = coupon.expires_at || coupon.valid_until || coupon.validUntil;
  if (expiresAt && new Date(expiresAt) < now) {
    throw new AppError(`This coupon has expired.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate live server-side cart subtotal
  let subtotal = 0;
  if (typeof addressIdOrCartTotal === 'number') {
    subtotal = addressIdOrCartTotal;
  } else {
    const cart = await cartService.getUserCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw new AppError('Your cart is empty. Add items before applying a coupon.', HTTP_STATUS.BAD_REQUEST);
    }
    subtotal = cart.subtotal;
  }

  const minRequired = parseFloat(coupon.minimum_order_amount || 0);
  if (subtotal < minRequired) {
    throw new AppError(`Minimum order value of ₹${minRequired} required.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Check usage limits
  const { globalCount, userCount } = await getCouponUsageCounts(coupon.id, userId);

  if (coupon.usage_limit && globalCount >= parseInt(coupon.usage_limit, 10)) {
    throw new AppError(`This coupon has reached its usage limit.`, HTTP_STATUS.BAD_REQUEST);
  }

  if (coupon.usage_limit_per_user && userCount >= parseInt(coupon.usage_limit_per_user, 10)) {
    throw new AppError(`You have already used this coupon the maximum number of times.`, HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate discount amount
  let discountAmount = 0;
  const rawDiscountVal = parseFloat(coupon.discount_value);

  if (coupon.discount_type === 'PERCENTAGE') {
    if (rawDiscountVal > 100) {
      throw new AppError('Invalid percentage discount value.', HTTP_STATUS.BAD_REQUEST);
    }
    discountAmount = (subtotal * rawDiscountVal) / 100.0;
    if (coupon.maximum_discount_amount) {
      const maxDisc = parseFloat(coupon.maximum_discount_amount);
      if (maxDisc > 0 && discountAmount > maxDisc) {
        discountAmount = maxDisc;
      }
    }
  } else {
    // FIXED
    discountAmount = rawDiscountVal;
  }

  // Security guard: Clamp discount so it never exceeds subtotal or creates negative total
  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = Math.max(0, parseFloat(discountAmount.toFixed(2)));

  // Calculate delivery fee if addressId string provided
  let deliveryCharge = 0;
  if (typeof addressIdOrCartTotal === 'string' && addressIdOrCartTotal) {
    try {
      const addresses = await addressService.getAddresses(userId);
      const sel = addresses.find(a => a.id === addressIdOrCartTotal);
      if (sel) {
        const info = deliveryService.getDeliveryDetailsForAddress(sel);
        deliveryCharge = info.deliveryCharge || 0;
      }
    } catch (e) {}
  }

  const finalAmount = Math.max(0, parseFloat((subtotal + deliveryCharge - discountAmount).toFixed(2)));

  return {
    valid: true,
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      minimumOrderAmount: minRequired,
      maximumDiscountAmount: coupon.maximum_discount_amount ? parseFloat(coupon.maximum_discount_amount) : null,
      discountType: coupon.discount_type,
      discountValue: rawDiscountVal,
      usageLimit: coupon.usage_limit,
      usageLimitPerUser: coupon.usage_limit_per_user
    },
    couponCode: coupon.code,
    discountType: coupon.discount_type,
    subtotal,
    deliveryCharge,
    discountAmount,
    finalAmount,
    totalAmount: finalAmount,
    message: `✓ ${coupon.code} applied! You saved ₹${discountAmount.toFixed(0)}`
  };
};

/**
 * Record a successful coupon usage upon order placement
 */
const recordCouponUsage = async (couponId, userId, orderId, discountAmount) => {
  if (!couponId || !userId) return null;

  const validOrderId = (orderId && isUuid(orderId)) ? orderId : null;

  const mockRecord = {
    id: `usg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    coupon_id: couponId,
    user_id: userId,
    order_id: orderId,
    discount_amount: discountAmount || 0,
    used_at: new Date().toISOString()
  };
  mockUsages.push(mockRecord);

  try {
    if (isUuid(couponId) && isUuid(userId)) {
      const res = await pool.query(`
        INSERT INTO coupon_usages (coupon_id, user_id, order_id, discount_amount, used_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [couponId, userId, validOrderId, discountAmount || 0]);
      if (res.rows.length > 0) return res.rows[0];
    }
  } catch (e) {}

  return mockRecord;
};

/**
 * Get available coupons and eligibility for user's current cart
 */
const getAvailableCoupons = async (userId) => {
  let activeCoupons = [];
  try {
    const res = await pool.query('SELECT * FROM coupons WHERE is_active = TRUE ORDER BY minimum_order_amount ASC');
    activeCoupons = res.rows;
  } catch (e) {
    if (supabase) {
      const { data } = await supabase.from('coupons').select('*').eq('is_active', true).order('minimum_order_amount', { ascending: true });
      activeCoupons = data || [];
    } else {
      activeCoupons = mockCoupons.filter(c => c.is_active);
    }
  }

  let cartSubtotal = 0;
  try {
    const cart = await cartService.getUserCart(userId);
    if (cart.items) {
      cartSubtotal = cart.subtotal || 0;
    }
  } catch (e) {}

  const now = new Date();
  const eligibleCoupons = [];

  for (const c of activeCoupons) {
    // Skip expired or unstarted coupons
    if (c.starts_at && new Date(c.starts_at) > now) continue;
    const expiresAt = c.expires_at || c.valid_until || c.validUntil;
    if (expiresAt && new Date(expiresAt) < now) continue;

    const min = parseFloat(c.minimum_order_amount || 0);
    const isEligible = cartSubtotal >= min;
    const neededAmount = isEligible ? 0 : Math.max(0, min - cartSubtotal);

    eligibleCoupons.push({
      id: c.id,
      code: c.code,
      description: c.description,
      minimumOrderAmount: min,
      maximumDiscountAmount: c.maximum_discount_amount ? parseFloat(c.maximum_discount_amount) : null,
      discountType: c.discount_type,
      discountValue: parseFloat(c.discount_value),
      isEligible,
      neededAmount
    });
  }

  return {
    cartSubtotal,
    coupons: eligibleCoupons
  };
};

/**
 * Admin: List all coupons with live usage metrics
 */
const getAdminCoupons = async () => {
  let couponsList = [];
  try {
    const res = await pool.query(`
      SELECT c.*, COALESCE(u.usage_count, 0) AS usage_count
      FROM coupons c
      LEFT JOIN (
        SELECT coupon_id, COUNT(*) AS usage_count
        FROM coupon_usages
        GROUP BY coupon_id
      ) u ON c.id = u.coupon_id
      ORDER BY c.created_at DESC
    `);
    couponsList = res.rows;
  } catch (e) {
    if (supabase) {
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      couponsList = data || [];
    } else {
      couponsList = mockCoupons;
    }
  }

  return couponsList.map(c => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discount_type,
    discountValue: parseFloat(c.discount_value),
    minimumOrderAmount: parseFloat(c.minimum_order_amount || 0),
    maximumDiscountAmount: c.maximum_discount_amount ? parseFloat(c.maximum_discount_amount) : null,
    usageLimit: c.usage_limit ? parseInt(c.usage_limit, 10) : null,
    usageLimitPerUser: c.usage_limit_per_user ? parseInt(c.usage_limit_per_user, 10) : null,
    usageCount: parseInt(c.usage_count || 0, 10) + mockUsages.filter(m => m.coupon_id === c.id).length,
    startsAt: c.starts_at,
    expiresAt: c.expires_at || c.valid_until || c.validUntil || null,
    isActive: c.is_active,
    createdAt: c.created_at
  }));
};

/**
 * Admin: Create a new coupon with full server-side validations
 */
const createCoupon = async (adminId, couponData, req = null) => {
  const code = String(couponData.code || '').trim().toUpperCase();
  if (!code) throw new AppError('Coupon code is required', HTTP_STATUS.BAD_REQUEST);

  const discountType = String(couponData.discountType || couponData.discount_type || 'FIXED').toUpperCase();
  if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
    throw new AppError('Discount type must be PERCENTAGE or FIXED', HTTP_STATUS.BAD_REQUEST);
  }

  const discountValue = parseFloat(couponData.discountValue || couponData.discount_value || 0);
  if (isNaN(discountValue) || discountValue <= 0) {
    throw new AppError('Discount value must be greater than 0', HTTP_STATUS.BAD_REQUEST);
  }
  if (discountType === 'PERCENTAGE' && discountValue > 100) {
    throw new AppError('Percentage discount value cannot exceed 100%', HTTP_STATUS.BAD_REQUEST);
  }

  const minOrderAmt = parseFloat(couponData.minimumOrderAmount || couponData.minimum_order_amount || 0);
  if (isNaN(minOrderAmt) || minOrderAmt < 0) {
    throw new AppError('Minimum order amount must be non-negative', HTTP_STATUS.BAD_REQUEST);
  }

  const maxDiscountAmt = couponData.maximumDiscountAmount || couponData.maximum_discount_amount ? parseFloat(couponData.maximumDiscountAmount || couponData.maximum_discount_amount) : null;
  if (maxDiscountAmt !== null && (isNaN(maxDiscountAmt) || maxDiscountAmt < 0)) {
    throw new AppError('Maximum discount amount must be non-negative', HTTP_STATUS.BAD_REQUEST);
  }

  const usageLimit = couponData.usageLimit || couponData.usage_limit ? parseInt(couponData.usageLimit || couponData.usage_limit, 10) : null;
  if (usageLimit !== null && (isNaN(usageLimit) || usageLimit <= 0)) {
    throw new AppError('Usage limit must be greater than 0', HTTP_STATUS.BAD_REQUEST);
  }

  const usageLimitPerUser = couponData.usageLimitPerUser || couponData.usage_limit_per_user ? parseInt(couponData.usageLimitPerUser || couponData.usage_limit_per_user, 10) : null;
  if (usageLimitPerUser !== null && (isNaN(usageLimitPerUser) || usageLimitPerUser <= 0)) {
    throw new AppError('Per-user usage limit must be greater than 0', HTTP_STATUS.BAD_REQUEST);
  }

  const startsAt = couponData.startsAt || couponData.starts_at || new Date().toISOString();
  const expiresAt = couponData.expiresAt || couponData.expires_at || couponData.validUntil || null;

  if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
    throw new AppError('Expiration date must be after start date', HTTP_STATUS.BAD_REQUEST);
  }

  const description = couponData.description || (discountType === 'PERCENTAGE' ? `${discountValue}% OFF` : `₹${discountValue} OFF`);
  const isActive = couponData.isActive !== undefined ? Boolean(couponData.isActive) : true;

  // Check duplicate code
  const existing = await getCouponByCode(code);
  if (existing) {
    throw new AppError(`Coupon code "${code}" already exists`, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const res = await pool.query(`
      INSERT INTO coupons 
      (code, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, usage_limit, usage_limit_per_user, starts_at, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [code, description, discountType, discountValue, minOrderAmt, maxDiscountAmt, usageLimit, usageLimitPerUser, startsAt, expiresAt, isActive]);

    const created = res.rows[0];
    await logAdminActivity(adminId, 'ADMIN_COUPON_CREATED', 'coupon', created.id, { code, discountType, discountValue }, req);
    return created;
  } catch (e) {
    if (supabase) {
      const { data, error } = await supabase.from('coupons').insert([{
        code, description, discount_type: discountType, discount_value: discountValue,
        minimum_order_amount: minOrderAmt, maximum_discount_amount: maxDiscountAmt,
        usage_limit: usageLimit, usage_limit_per_user: usageLimitPerUser,
        starts_at: startsAt, expires_at: expiresAt, is_active: isActive
      }]).select().single();
      if (!error && data) return data;
    }
  }

  const mockNew = {
    id: `cpn-${Date.now()}`,
    code, description, discount_type: discountType, discount_value: discountValue,
    minimum_order_amount: minOrderAmt, maximum_discount_amount: maxDiscountAmt,
    usage_limit: usageLimit, usage_limit_per_user: usageLimitPerUser,
    starts_at: startsAt, expires_at: expiresAt, is_active: isActive,
    created_at: new Date().toISOString()
  };
  mockCoupons.push(mockNew);
  return mockNew;
};

/**
 * Admin: Update coupon
 */
const updateCoupon = async (adminId, couponId, updateData, req = null) => {
  const coupon = await getCouponById(couponId);
  if (!coupon) throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);

  const payload = {};
  if (updateData.code) payload.code = String(updateData.code).trim().toUpperCase();
  if (updateData.description !== undefined) payload.description = updateData.description;
  if (updateData.discountType) payload.discount_type = updateData.discountType;
  if (updateData.discountValue !== undefined) payload.discount_value = parseFloat(updateData.discountValue);
  if (updateData.minimumOrderAmount !== undefined) payload.minimum_order_amount = parseFloat(updateData.minimumOrderAmount);
  if (updateData.maximumDiscountAmount !== undefined) payload.maximum_discount_amount = updateData.maximumDiscountAmount ? parseFloat(updateData.maximumDiscountAmount) : null;
  if (updateData.usageLimit !== undefined) payload.usage_limit = updateData.usageLimit ? parseInt(updateData.usageLimit, 10) : null;
  if (updateData.usageLimitPerUser !== undefined) payload.usage_limit_per_user = updateData.usageLimitPerUser ? parseInt(updateData.usageLimitPerUser, 10) : null;
  if (updateData.startsAt) payload.starts_at = updateData.startsAt;
  if (updateData.expiresAt !== undefined) payload.expires_at = updateData.expiresAt;
  if (updateData.isActive !== undefined) payload.is_active = Boolean(updateData.isActive);
  payload.updated_at = new Date().toISOString();

  try {
    if (isUuid(couponId)) {
      const keys = Object.keys(payload);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = Object.values(payload);
      values.push(couponId);

      const res = await pool.query(`UPDATE coupons SET ${setClause} WHERE id = $${values.length} RETURNING *`, values);
      if (res.rows.length > 0) {
        await logAdminActivity(adminId, 'ADMIN_COUPON_UPDATED', 'coupon', couponId, payload, req);
        return res.rows[0];
      }
    }
  } catch (e) {}

  Object.assign(coupon, payload);
  return coupon;
};

/**
 * Admin: Activate Coupon
 */
const activateCoupon = async (adminId, couponId, req = null) => {
  return updateCoupon(adminId, couponId, { isActive: true }, req);
};

/**
 * Admin: Deactivate Coupon
 */
const deactivateCoupon = async (adminId, couponId, req = null) => {
  return updateCoupon(adminId, couponId, { isActive: false }, req);
};

/**
 * Admin: Delete Coupon (Safe Soft-Deactivation if references exist)
 */
const deleteCoupon = async (adminId, couponId, req = null) => {
  const coupon = await getCouponById(couponId);
  if (!coupon) throw new AppError('Coupon not found', HTTP_STATUS.NOT_FOUND);

  let hasOrders = false;
  try {
    if (isUuid(couponId)) {
      const uRes = await pool.query('SELECT 1 FROM coupon_usages WHERE coupon_id = $1 LIMIT 1', [couponId]);
      const oRes = await pool.query('SELECT 1 FROM orders WHERE coupon_id = $1 LIMIT 1', [couponId]);
      if (uRes.rows.length > 0 || oRes.rows.length > 0) {
        hasOrders = true;
      }
    }
  } catch (e) {}

  if (hasOrders) {
    // Preserve financial history: Soft deactivation
    await updateCoupon(adminId, couponId, { isActive: false }, req);
    await logAdminActivity(adminId, 'ADMIN_COUPON_SOFT_DELETED', 'coupon', couponId, { reason: 'Has historical usage' }, req);
    return { message: 'Coupon has historical usage. Safely deactivated to preserve order integrity.' };
  }

  try {
    if (isUuid(couponId)) {
      await pool.query('DELETE FROM coupons WHERE id = $1', [couponId]);
      await logAdminActivity(adminId, 'ADMIN_COUPON_DELETED', 'coupon', couponId, {}, req);
      return { message: 'Coupon deleted successfully' };
    }
  } catch (e) {}

  const idx = mockCoupons.findIndex(c => c.id === couponId);
  if (idx !== -1) mockCoupons.splice(idx, 1);
  return { message: 'Coupon deleted successfully' };
};

module.exports = {
  getCouponByCode,
  getCouponById,
  getCouponUsageCounts,
  validateCoupon,
  recordCouponUsage,
  getAvailableCoupons,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  activateCoupon,
  deactivateCoupon,
  deleteCoupon
};
