const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const loyaltyService = require('./loyalty.service');

const mockReferralCodes = new Map();
const mockReferrals = new Map();
const mockLedger = new Map();

/**
 * Get or create primary unique referral code for customer
 */
const getOrCreateReferralCode = async (userId) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  let existing = mockReferralCodes.get(userId);
  if (supabase) {
    try {
      const { data } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) existing = data;
    } catch (e) {}
  }

  if (existing) return existing;

  const shortCode = String(userId).replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'USER';
  const code = `REF-${shortCode}-${Math.floor(10 + Math.random() * 90)}`;

  const record = {
    id: `refc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    code,
    is_active: true,
    total_referrals: 0,
    successful_referrals: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .insert([record])
        .select()
        .single();
      if (!error && data) {
        mockReferralCodes.set(userId, data);
        return data;
      }
    } catch (e) {}
  }

  mockReferralCodes.set(userId, record);
  return record;
};

/**
 * Apply Referral Code on Signup/Checkout with Self-Referral Prevention
 */
const applyReferralCode = async (referredUserId, codeInput) => {
  if (!referredUserId || !codeInput) {
    throw new AppError('Referred User ID and Referral Code are required', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanCode = String(codeInput).trim().toUpperCase();
  let codeRecord = Array.from(mockReferralCodes.values()).find(rc => rc.code === cleanCode);

  if (supabase && !codeRecord) {
    try {
      const { data } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();
      if (data) codeRecord = data;
    } catch (e) {}
  }

  if (!codeRecord || !codeRecord.is_active) {
    throw new AppError('Invalid or inactive referral code', HTTP_STATUS.BAD_REQUEST);
  }

  // Critical Safety Rule: Self-referral prevention guard
  if (codeRecord.user_id === referredUserId) {
    throw new AppError('Self-referral is strictly prohibited. You cannot use your own referral code', HTTP_STATUS.BAD_REQUEST);
  }

  // Duplicate referral guard
  const existingReferral = Array.from(mockReferrals.values()).find(r => r.referred_user_id === referredUserId);
  if (existingReferral) {
    throw new AppError('This customer account has already been referred', HTTP_STATUS.BAD_REQUEST);
  }

  const referralRecord = {
    id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    referral_code_id: codeRecord.id,
    referrer_user_id: codeRecord.user_id,
    referred_user_id: referredUserId,
    qualified_order_id: null,
    status: 'PENDING',
    reward_amount: 50.00, // ₹50 / 100 Loyalty Points Reward
    created_at: new Date().toISOString(),
    qualified_at: null,
    completed_at: null
  };

  codeRecord.total_referrals += 1;
  codeRecord.updated_at = new Date().toISOString();

  if (supabase) {
    try {
      await supabase.from('referrals').insert([referralRecord]);
      await supabase.from('referral_codes').update(codeRecord).eq('id', codeRecord.id);
    } catch (e) {}
  }

  mockReferrals.set(referralRecord.id, referralRecord);
  mockReferralCodes.set(codeRecord.user_id, codeRecord);

  return referralRecord;
};

/**
 * Qualify & Process Referral Reward after First Order Completion (Append-Only Ledger)
 */
const processQualifiedOrder = async (referredUserId, qualifiedOrderId, orderTotal = 0) => {
  const referral = Array.from(mockReferrals.values()).find(r => r.referred_user_id === referredUserId && r.status === 'PENDING');
  if (!referral) return null;

  referral.status = 'QUALIFIED';
  referral.qualified_order_id = qualifiedOrderId;
  referral.qualified_at = new Date().toISOString();

  // Post Append-Only Ledger Entry (100 Loyalty Points credited to Referrer)
  const ledgerEntry = {
    id: `rfl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    referral_id: referral.id,
    user_id: referral.referrer_user_id,
    reward_type: 'LOYALTY_POINTS',
    points: 100,
    cash_value: 50.00,
    direction: 'CREDIT',
    reason: `Referral reward bonus for referring user ${referredUserId}`,
    reference_id: qualifiedOrderId,
    created_at: new Date().toISOString()
  };

  try {
    await loyaltyService.adjustPoints(referral.referrer_user_id, 100, `Referral reward bonus (Order ${qualifiedOrderId})`);
  } catch (e) {}

  referral.status = 'REWARDED';
  referral.completed_at = new Date().toISOString();

  // Update referrer stats
  const codeRecord = mockReferralCodes.get(referral.referrer_user_id);
  if (codeRecord) {
    codeRecord.successful_referrals += 1;
    mockReferralCodes.set(codeRecord.user_id, codeRecord);
  }

  if (supabase) {
    try {
      await supabase.from('referral_reward_ledger').insert([ledgerEntry]);
      await supabase.from('referrals').update(referral).eq('id', referral.id);
    } catch (e) {}
  }

  mockLedger.set(ledgerEntry.id, ledgerEntry);
  mockReferrals.set(referral.id, referral);

  return { referral, ledgerEntry };
};

/**
 * Get Referral Summary for Customer
 */
const getReferralSummary = async (userId) => {
  const codeRecord = await getOrCreateReferralCode(userId);
  const myReferrals = Array.from(mockReferrals.values()).filter(r => r.referrer_user_id === userId);
  const myLedger = Array.from(mockLedger.values()).filter(l => l.user_id === userId);

  const successfulCount = myReferrals.filter(r => r.status === 'REWARDED').length;
  const pendingCount = myReferrals.filter(r => r.status === 'PENDING' || r.status === 'QUALIFIED').length;
  const totalPointsEarned = myLedger.reduce((acc, l) => acc + (l.points || 0), 0);

  return {
    referralCode: codeRecord.code,
    referralLink: `https://chaudharykiranastore.com/register?ref=${codeRecord.code}`,
    stats: {
      totalReferrals: myReferrals.length,
      successfulCount,
      pendingCount,
      totalPointsEarned
    },
    referrals: myReferrals,
    rewardHistory: myLedger
  };
};

/**
 * Admin: Referral Management Overview
 */
const listReferralsAdmin = async () => {
  const allCodes = Array.from(mockReferralCodes.values());
  const allReferrals = Array.from(mockReferrals.values());
  const allLedger = Array.from(mockLedger.values());

  const totalCodes = allCodes.length;
  const totalSuccessful = allReferrals.filter(r => r.status === 'REWARDED').length;
  const totalPending = allReferrals.filter(r => r.status === 'PENDING').length;
  const totalRewardsValue = allLedger.reduce((acc, l) => acc + parseFloat(l.cash_value || 0), 0);

  return {
    codes: allCodes,
    referrals: allReferrals,
    summary: {
      totalCodes,
      totalSuccessful,
      totalPending,
      totalRewardsValue: Math.round(totalRewardsValue * 100) / 100
    }
  };
};

module.exports = {
  getOrCreateReferralCode,
  applyReferralCode,
  processQualifiedOrder,
  getReferralSummary,
  listReferralsAdmin,
  mockReferralCodes,
  mockReferrals,
  mockLedger
};
