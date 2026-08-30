const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// In-Memory Storage Fallbacks
const mockLoyaltyAccounts = new Map();
const mockLoyaltyLedger = new Map();

// Tier Thresholds & Multipliers
const TIER_RULES = {
  SILVER: { minPoints: 0, multiplier: 1.0, name: 'Silver Member' },
  GOLD: { minPoints: 500, multiplier: 1.5, name: 'Gold Member' },
  PLATINUM: { minPoints: 2000, multiplier: 2.0, name: 'Platinum VIP' }
};

/**
 * Determine Tier based on lifetime points
 */
const calculateTier = (lifetimePoints = 0) => {
  if (lifetimePoints >= TIER_RULES.PLATINUM.minPoints) return 'PLATINUM';
  if (lifetimePoints >= TIER_RULES.GOLD.minPoints) return 'GOLD';
  return 'SILVER';
};

/**
 * 1. Get Customer Loyalty Account & Tier Status
 */
const getLoyaltyAccount = async (userId) => {
  if (!userId) {
    throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  let account = mockLoyaltyAccounts.get(userId);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        account = data;
      }
    } catch (e) {}
  }

  if (!account) {
    account = {
      id: `loy-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      branch_id: null,
      points_balance: 0,
      lifetime_points: 0,
      tier: 'SILVER',
      tier_evaluated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockLoyaltyAccounts.set(userId, account);
  }

  const currentTier = account.tier || calculateTier(account.lifetime_points);
  let nextTier = null;
  let pointsNeededForNextTier = 0;

  if (currentTier === 'SILVER') {
    nextTier = 'GOLD';
    pointsNeededForNextTier = Math.max(0, TIER_RULES.GOLD.minPoints - account.lifetime_points);
  } else if (currentTier === 'GOLD') {
    nextTier = 'PLATINUM';
    pointsNeededForNextTier = Math.max(0, TIER_RULES.PLATINUM.minPoints - account.lifetime_points);
  }

  return {
    ...account,
    points_balance: parseInt(account.points_balance || 0, 10),
    lifetime_points: parseInt(account.lifetime_points || 0, 10),
    tier: currentTier,
    rupee_value: parseInt(account.points_balance || 0, 10) * 1, // 1 point = ₹1
    tierProgress: {
      currentTier,
      nextTier,
      pointsNeededForNextTier,
      multiplier: TIER_RULES[currentTier].multiplier
    }
  };
};

/**
 * 2. Earn Loyalty Points on Completed Purchase
 */
const earnPoints = async (userId, orderTotal, referenceId = '', createdBy = 'SYSTEM') => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  const numAmount = parseFloat(orderTotal || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { earnedPoints: 0, account: await getLoyaltyAccount(userId) };
  }

  const account = await getLoyaltyAccount(userId);
  const currentTier = account.tier || 'SILVER';
  const multiplier = TIER_RULES[currentTier].multiplier;

  // Base Rule: 1 point per ₹100 spent * tier multiplier
  const basePoints = Math.floor(numAmount / 100);
  const earnedPoints = Math.floor(basePoints * multiplier);

  if (earnedPoints <= 0) {
    return { earnedPoints: 0, account };
  }

  const newBalance = account.points_balance + earnedPoints;
  const newLifetime = account.lifetime_points + earnedPoints;
  const newTier = calculateTier(newLifetime);

  account.points_balance = newBalance;
  account.lifetime_points = newLifetime;
  account.tier = newTier;
  account.tier_evaluated_at = new Date().toISOString();
  account.updated_at = new Date().toISOString();

  const ledgerRecord = {
    id: `lleg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    loyalty_account_id: account.id,
    user_id: userId,
    points: earnedPoints,
    transaction_type: 'EARN',
    reference_id: referenceId,
    notes: `Earned ${earnedPoints} points on ₹${numAmount} order (${currentTier} Tier)`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      if (isUuid(account.id)) {
        await supabase.from('loyalty_accounts').update({
          points_balance: newBalance,
          lifetime_points: newLifetime,
          tier: newTier,
          tier_evaluated_at: account.tier_evaluated_at,
          updated_at: account.updated_at
        }).eq('id', account.id);
      }

      const { data: savedLedger } = await supabase.from('loyalty_points_ledger').insert([{
        loyalty_account_id: isUuid(account.id) ? account.id : null,
        user_id: isUuid(userId) ? userId : null,
        points: ledgerRecord.points,
        transaction_type: ledgerRecord.transaction_type,
        reference_id: ledgerRecord.reference_id,
        notes: ledgerRecord.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (savedLedger) ledgerRecord.id = savedLedger.id;
    } catch (e) {}
  }

  mockLoyaltyAccounts.set(userId, account);
  mockLoyaltyLedger.set(ledgerRecord.id, ledgerRecord);

  return {
    earnedPoints,
    account: await getLoyaltyAccount(userId),
    ledger: ledgerRecord
  };
};

/**
 * 3. Redeem Loyalty Points for Order Discount
 */
const redeemPoints = async ({ userId, pointsToRedeem, orderTotal, referenceId = '', createdBy = 'CUSTOMER' }) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  const points = parseInt(pointsToRedeem || 0, 10);
  if (isNaN(points) || points <= 0) {
    throw new AppError('Points to redeem must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }

  const orderNum = parseFloat(orderTotal || 0);
  if (isNaN(orderNum) || orderNum <= 0) {
    throw new AppError('Order total must be positive for point redemption', HTTP_STATUS.BAD_REQUEST);
  }

  const account = await getLoyaltyAccount(userId);

  if (points > account.points_balance) {
    throw new AppError(`Insufficient points. Requested: ${points}, Available: ${account.points_balance}`, HTTP_STATUS.BAD_REQUEST);
  }

  // 50% Redemption Cap Constraint
  const maxDiscountAllowed = Math.floor(orderNum * 0.50);
  const requestedDiscount = points * 1; // 1 point = ₹1

  if (requestedDiscount > maxDiscountAllowed) {
    throw new AppError(`Loyalty point redemption capped at 50% of order total (₹${maxDiscountAllowed}). Requested redemption value: ₹${requestedDiscount}.`, HTTP_STATUS.BAD_REQUEST);
  }

  const newBalance = account.points_balance - points;
  account.points_balance = newBalance;
  account.updated_at = new Date().toISOString();

  const ledgerRecord = {
    id: `lleg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    loyalty_account_id: account.id,
    user_id: userId,
    points: -points,
    transaction_type: 'REDEEM',
    reference_id: referenceId,
    notes: `Redeemed ${points} points for ₹${requestedDiscount} discount on order`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      if (isUuid(account.id)) {
        await supabase.from('loyalty_accounts').update({
          points_balance: newBalance,
          updated_at: account.updated_at
        }).eq('id', account.id);
      }

      const { data: savedLedger } = await supabase.from('loyalty_points_ledger').insert([{
        loyalty_account_id: isUuid(account.id) ? account.id : null,
        user_id: isUuid(userId) ? userId : null,
        points: ledgerRecord.points,
        transaction_type: ledgerRecord.transaction_type,
        reference_id: ledgerRecord.reference_id,
        notes: ledgerRecord.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (savedLedger) ledgerRecord.id = savedLedger.id;
    } catch (e) {}
  }

  mockLoyaltyAccounts.set(userId, account);
  mockLoyaltyLedger.set(ledgerRecord.id, ledgerRecord);

  return {
    discountAmount: requestedDiscount,
    pointsRedeemed: points,
    account: await getLoyaltyAccount(userId),
    ledger: ledgerRecord
  };
};

/**
 * 4. Manual Point Adjustment (Admin - Requires mandatory reason)
 */
const adjustPoints = async (userId, pointsDelta, reason, createdBy = 'ADMIN') => {
  if (!reason || !reason.trim()) {
    throw new AppError('Mandatory reason is required for manual loyalty point adjustments', HTTP_STATUS.BAD_REQUEST);
  }

  const delta = parseInt(pointsDelta || 0, 10);
  if (isNaN(delta) || delta === 0) {
    throw new AppError('Point adjustment delta must be a non-zero integer', HTTP_STATUS.BAD_REQUEST);
  }

  const account = await getLoyaltyAccount(userId);
  const newBalance = account.points_balance + delta;

  if (newBalance < 0) {
    throw new AppError(`Adjustment would result in negative points balance (${newBalance}). Current balance: ${account.points_balance}`, HTTP_STATUS.BAD_REQUEST);
  }

  account.points_balance = newBalance;
  if (delta > 0) {
    account.lifetime_points += delta;
    account.tier = calculateTier(account.lifetime_points);
  }
  account.updated_at = new Date().toISOString();

  const ledgerRecord = {
    id: `lleg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    loyalty_account_id: account.id,
    user_id: userId,
    points: delta,
    transaction_type: 'ADJUSTMENT',
    reference_id: '',
    notes: `Manual Adjustment: ${reason.trim()}`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      if (isUuid(account.id)) {
        await supabase.from('loyalty_accounts').update({
          points_balance: account.points_balance,
          lifetime_points: account.lifetime_points,
          tier: account.tier,
          updated_at: account.updated_at
        }).eq('id', account.id);
      }

      const { data: savedLedger } = await supabase.from('loyalty_points_ledger').insert([{
        loyalty_account_id: isUuid(account.id) ? account.id : null,
        user_id: isUuid(userId) ? userId : null,
        points: ledgerRecord.points,
        transaction_type: ledgerRecord.transaction_type,
        reference_id: ledgerRecord.reference_id,
        notes: ledgerRecord.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (savedLedger) ledgerRecord.id = savedLedger.id;
    } catch (e) {}
  }

  mockLoyaltyAccounts.set(userId, account);
  mockLoyaltyLedger.set(ledgerRecord.id, ledgerRecord);

  return {
    account: await getLoyaltyAccount(userId),
    ledger: ledgerRecord
  };
};

/**
 * 5. Get Loyalty Ledger History
 */
const getLedger = async (userId, queryParams = {}) => {
  const account = await getLoyaltyAccount(userId);
  let list = Array.from(mockLoyaltyLedger.values()).filter(l => l.user_id === userId || l.loyalty_account_id === account.id);

  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from('loyalty_points_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    account,
    ledger: list
  };
};

/**
 * 6. List All Loyalty Accounts (Admin Leaderboard)
 */
const listLoyaltyAccounts = async (queryParams = {}) => {
  let list = Array.from(mockLoyaltyAccounts.values());

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loyalty_accounts')
        .select('*, users(full_name, phone_number, email)')
        .order('lifetime_points', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.tier) {
    list = list.filter(l => l.tier === queryParams.tier);
  }

  return {
    accounts: list,
    tierBreakdown: {
      silverCount: list.filter(l => l.tier === 'SILVER').length,
      goldCount: list.filter(l => l.tier === 'GOLD').length,
      platinumCount: list.filter(l => l.tier === 'PLATINUM').length
    }
  };
};

module.exports = {
  getLoyaltyAccount,
  earnPoints,
  redeemPoints,
  adjustPoints,
  getLedger,
  listLoyaltyAccounts,
  mockLoyaltyAccounts,
  mockLoyaltyLedger
};
