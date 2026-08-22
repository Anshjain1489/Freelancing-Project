const supabase = require('../config/supabase');
const cartService = require('./cart.service');
const addressService = require('./address.service');
const deliveryService = require('./delivery.service');
const { logAdminActivity } = require('./adminLog.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

// Mock fallback store
const mockCoupons = [
  { id: 'cpn-1', code: 'SAVE20', description: '₹20 OFF on orders above ₹1,000', minimum_order_amount: 1000.00, discount_type: 'FIXED', discount_value: 20.00, is_active: true, created_at: new Date().toISOString() },
  { id: 'cpn-2', code: 'SAVE50', description: '₹50 OFF on orders above ₹2,000', minimum_order_amount: 2000.00, discount_type: 'FIXED', discount_value: 50.00, is_active: true, created_at: new Date().toISOString() },
  { id: 'cpn-3', code: 'SAVE200', description: '₹200 OFF on orders above ₹5,000', minimum_order_amount: 5000.00, discount_type: 'FIXED', discount_value: 200.00, is_active: true, created_at: new Date().toISOString() },
  { id: 'cpn-4', code: 'SAVE500', description: '₹500 OFF on orders above ₹10,000', minimum_order_amount: 10000.00, discount_type: 'FIXED', discount_value: 500.00, is_active: true, created_at: new Date().toISOString() }
];

/**
 * Helper to fetch a coupon by code (case-insensitive)
 */
const getCouponByCode = async (rawCode) => {
  if (!rawCode || typeof rawCode !== 'string') return null;
  const normalizedCode = rawCode.trim().toUpperCase();

  if (supabase) {
    const { data } = await supabase.from('coupons')
      .select('*')
      .ilike('code', normalizedCode)
      .maybeSingle();
    if (data) return data;
  }

  return mockCoupons.find(c => c.code.toUpperCase() === normalizedCode) || null;
};

/**
 * Validate a coupon for a given user's cart (Server-Side Validation)
 */
const validateCoupon = async (userId, couponCode, addressId = null) => {
  if (!couponCode || !String(couponCode).trim()) {
    throw new AppError('Coupon code is required', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedCode = String(couponCode).trim().toUpperCase();
  const coupon = await getCouponByCode(normalizedCode);

  if (!coupon || !coupon.is_active) {
    throw new AppError(`Invalid or inactive coupon code: "${normalizedCode}"`, HTTP_STATUS.BAD_REQUEST);
  }

  // Calculate live server-side cart subtotal
  const cart = await cartService.getUserCart(userId);
  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Add items before applying a coupon.', HTTP_STATUS.BAD_REQUEST);
  }

  const subtotal = cart.items.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
  const minRequired = parseFloat(coupon.minimum_order_amount);

  if (subtotal < minRequired) {
    const needed = (minRequired - subtotal).toFixed(0);
    throw new AppError(`Add ₹${needed} more items to use coupon "${coupon.code}".`, HTTP_STATUS.BAD_REQUEST);
  }

  let discountAmount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    discountAmount = (subtotal * parseFloat(coupon.discount_value)) / 100;
  } else {
    discountAmount = parseFloat(coupon.discount_value);
  }

  // Security guard: Clamp discount so it never exceeds subtotal or creates negative final amount
  discountAmount = Math.min(discountAmount, subtotal);

  // Calculate optional delivery fee if addressId provided
  let deliveryCharge = 0;
  if (addressId) {
    try {
      const addresses = await addressService.getAddresses(userId);
      const sel = addresses.find(a => a.id === addressId);
      if (sel) {
        const info = deliveryService.getDeliveryDetailsForAddress(sel);
        deliveryCharge = info.deliveryCharge || 0;
      }
    } catch {}
  }

  const totalAmount = Math.max(0, subtotal + deliveryCharge - discountAmount);

  return {
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      minimumOrderAmount: minRequired,
      discountType: coupon.discount_type,
      discountValue: parseFloat(coupon.discount_value)
    },
    subtotal,
    deliveryCharge,
    discountAmount,
    totalAmount,
    message: `Coupon "${coupon.code}" applied successfully! You saved ₹${discountAmount.toFixed(0)} 🎉`
  };
};

/**
 * Get available coupons and their live eligibility for the user's cart
 */
const getAvailableCoupons = async (userId) => {
  let activeCoupons = [];
  if (supabase) {
    const { data } = await supabase.from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('minimum_order_amount', { ascending: true });
    activeCoupons = data || [];
  } else {
    activeCoupons = mockCoupons.filter(c => c.is_active);
  }

  // Compute current cart subtotal
  let cartSubtotal = 0;
  try {
    const cart = await cartService.getUserCart(userId);
    if (cart.items) {
      cartSubtotal = cart.items.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    }
  } catch {}

  const couponsWithEligibility = activeCoupons.map(c => {
    const min = parseFloat(c.minimum_order_amount);
    const isEligible = cartSubtotal >= min;
    const neededAmount = isEligible ? 0 : Math.max(0, min - cartSubtotal);

    return {
      id: c.id,
      code: c.code,
      description: c.description,
      minimumOrderAmount: min,
      discountType: c.discount_type,
      discountValue: parseFloat(c.discount_value),
      isEligible,
      neededAmount
    };
  });

  return {
    cartSubtotal,
    coupons: couponsWithEligibility
  };
};

/**
 * Admin CRUD: Get all coupons
 */
const getAdminCoupons = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
  }
  return mockCoupons;
};

/**
 * Admin CRUD: Create coupon
 */
const createCoupon = async (adminId, couponData, req = null) => {
  const code = String(couponData.code || '').trim().toUpperCase();
  if (!code) throw new AppError('Coupon code is required', HTTP_STATUS.BAD_REQUEST);

  const minAmt = parseFloat(couponData.minimumOrderAmount || couponData.minimum_order_amount || 0);
  const discVal = parseFloat(couponData.discountValue || couponData.discount_value || 0);
  const discType = couponData.discountType || couponData.discount_type || 'FIXED';
  const description = couponData.description || `₹${discVal} OFF on orders above ₹${minAmt}`;

  if (supabase) {
    const { data, error } = await supabase.from('coupons').insert([{
      code,
      description,
      minimum_order_amount: minAmt,
      discount_type: discType,
      discount_value: discVal,
      is_active: couponData.isActive ?? true
    }]).select().single();

    if (error) throw new AppError('Failed to create coupon: ' + error.message, HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, 'ADMIN_COUPON_CREATED', 'coupon', data.id, { code, minAmt, discVal }, req);
    return data;
  }

  const mockNew = {
    id: `cpn-${Date.now()}`,
    code,
    description,
    minimum_order_amount: minAmt,
    discount_type: discType,
    discount_value: discVal,
    is_active: couponData.isActive ?? true,
    created_at: new Date().toISOString()
  };
  mockCoupons.push(mockNew);
  return mockNew;
};

/**
 * Admin CRUD: Update coupon
 */
const updateCoupon = async (adminId, couponId, updateData, req = null) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(couponId));

  if (supabase && isUuid) {
    const payload = {};
    if (updateData.code) payload.code = String(updateData.code).trim().toUpperCase();
    if (updateData.description !== undefined) payload.description = updateData.description;
    if (updateData.minimumOrderAmount !== undefined) payload.minimum_order_amount = parseFloat(updateData.minimumOrderAmount);
    if (updateData.discountValue !== undefined) payload.discount_value = parseFloat(updateData.discountValue);
    if (updateData.discountType) payload.discount_type = updateData.discountType;
    if (updateData.isActive !== undefined) payload.is_active = updateData.isActive;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('coupons')
      .update(payload)
      .eq('id', couponId)
      .select()
      .maybeSingle();

    if (!error && data) {
      await logAdminActivity(adminId, 'ADMIN_COUPON_UPDATED', 'coupon', couponId, payload, req);
      return data;
    }
  }

  const found = mockCoupons.find(c => c.id === couponId || c.code === couponId);
  if (found) {
    if (updateData.isActive !== undefined) found.is_active = updateData.isActive;
    if (updateData.minimumOrderAmount !== undefined) found.minimum_order_amount = updateData.minimumOrderAmount;
  }
  return found || { id: couponId, ...updateData };
};

/**
 * Admin CRUD: Delete coupon
 */
const deleteCoupon = async (adminId, couponId, req = null) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(couponId));

  if (supabase && isUuid) {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    if (error) throw new AppError('Cannot delete coupon referenced by existing orders', HTTP_STATUS.BAD_REQUEST);
    await logAdminActivity(adminId, 'ADMIN_COUPON_DELETED', 'coupon', couponId, {}, req);
  }
  return { message: 'Coupon deleted successfully' };
};

module.exports = {
  getCouponByCode,
  validateCoupon,
  getAvailableCoupons,
  getAdminCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
