const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const financialLedgerService = require('../admin/financialLedger.service');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// In-Memory Storage Fallbacks
const mockCreditAccounts = new Map();
const mockCreditTransactions = new Map();

/**
 * Helper: Calculate Available Credit
 */
const calcAvailableCredit = (account) => {
  const limit = parseFloat(account.credit_limit || 0);
  const balance = parseFloat(account.outstanding_balance || 0);
  return Math.max(0, Math.round((limit - balance) * 100) / 100);
};

/**
 * 1. Get Customer Credit Account
 */
const getCreditAccount = async (userId) => {
  if (!userId) {
    throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  let account = mockCreditAccounts.get(userId);

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_store_credit')
        .select('*, users(full_name, phone_number, email)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        account = data;
      }
    } catch (e) {}
  }

  if (!account) {
    account = {
      id: `khata-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      branch_id: null,
      credit_limit: 0.00,
      outstanding_balance: 0.00,
      status: 'ACTIVE',
      approved_by: null,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockCreditAccounts.set(userId, account);
  }

  return {
    ...account,
    credit_limit: parseFloat(account.credit_limit || 0),
    outstanding_balance: parseFloat(account.outstanding_balance || 0),
    available_credit: calcAvailableCredit(account)
  };
};

/**
 * 2. Create / Set Customer Credit Account (Admin)
 */
const setCreditAccount = async (userId, data = {}, approvedBy = 'ADMIN') => {
  if (!userId) {
    throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  const limitNum = parseFloat(data.creditLimit || 0);
  if (isNaN(limitNum) || limitNum < 0) {
    throw new AppError('Credit limit must be a non-negative number', HTTP_STATUS.BAD_REQUEST);
  }

  const status = (data.status || 'ACTIVE').toUpperCase();
  if (!['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
    throw new AppError('Invalid status. Allowed: ACTIVE, SUSPENDED, CLOSED', HTTP_STATUS.BAD_REQUEST);
  }

  let account = mockCreditAccounts.get(userId);

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('customer_store_credit')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        account = existing;
      }
    } catch (e) {}
  }

  if (!account) {
    account = {
      id: `khata-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      branch_id: data.branchId || null,
      credit_limit: Math.round(limitNum * 100) / 100,
      outstanding_balance: 0.00,
      status,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } else {
    account.credit_limit = Math.round(limitNum * 100) / 100;
    account.status = status;
    account.approved_by = approvedBy;
    account.updated_at = new Date().toISOString();
  }

  if (supabase) {
    try {
      const { data: saved, error } = await supabase.from('customer_store_credit').upsert([{
        user_id: isUuid(userId) ? userId : null,
        branch_id: isUuid(data.branchId) ? data.branchId : null,
        credit_limit: account.credit_limit,
        outstanding_balance: account.outstanding_balance,
        status: account.status,
        approved_by: isUuid(approvedBy) ? approvedBy : null,
        approved_at: account.approved_at,
        updated_at: account.updated_at
      }], { onConflict: 'user_id' }).select().single();

      if (!error && saved) {
        account.id = saved.id;
      }
    } catch (e) {}
  }

  mockCreditAccounts.set(userId, account);

  return {
    ...account,
    available_credit: calcAvailableCredit(account)
  };
};

/**
 * 3. Update Credit Limit (Admin)
 */
const updateCreditLimit = async (userId, newLimit, updatedBy = 'ADMIN') => {
  const account = await getCreditAccount(userId);
  return setCreditAccount(userId, { creditLimit: newLimit, status: account.status }, updatedBy);
};

/**
 * 4. Suspend Credit Account (Admin)
 */
const suspendCreditAccount = async (userId, suspendedBy = 'ADMIN') => {
  const account = await getCreditAccount(userId);
  return setCreditAccount(userId, { creditLimit: account.credit_limit, status: 'SUSPENDED' }, suspendedBy);
};

/**
 * 5. Create Credit Purchase (Debit Transaction)
 */
const createCreditPurchase = async ({ userId, amount, referenceId = '', notes = '', createdBy = 'SYSTEM' }) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError('Credit purchase amount must be positive', HTTP_STATUS.BAD_REQUEST);
  }

  const account = await getCreditAccount(userId);

  if (account.status !== 'ACTIVE') {
    throw new AppError(`Store credit account is ${account.status}. Cannot place Udhar order.`, HTTP_STATUS.FORBIDDEN);
  }

  const available = calcAvailableCredit(account);
  if (numAmount > available) {
    throw new AppError(`Credit purchase amount (₹${numAmount}) exceeds available credit limit (₹${available}). Outstanding balance: ₹${account.outstanding_balance}, Limit: ₹${account.credit_limit}.`, HTTP_STATUS.BAD_REQUEST);
  }

  const newBalance = Math.round((account.outstanding_balance + numAmount) * 100) / 100;
  account.outstanding_balance = newBalance;
  account.updated_at = new Date().toISOString();

  const txRecord = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    credit_account_id: account.id,
    user_id: userId,
    amount: Math.round(numAmount * 100) / 100,
    transaction_type: 'DEBIT_PURCHASE',
    reference_id: referenceId,
    notes: notes || 'Store Credit Purchase (Udhar)',
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      if (isUuid(account.id)) {
        await supabase.from('customer_store_credit').update({
          outstanding_balance: newBalance,
          updated_at: account.updated_at
        }).eq('id', account.id);
      }

      const { data: savedTx } = await supabase.from('store_credit_transactions').insert([{
        credit_account_id: isUuid(account.id) ? account.id : null,
        user_id: isUuid(userId) ? userId : null,
        amount: txRecord.amount,
        transaction_type: txRecord.transaction_type,
        reference_id: txRecord.reference_id,
        notes: txRecord.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (savedTx) txRecord.id = savedTx.id;
    } catch (e) {}
  }

  mockCreditAccounts.set(userId, account);
  mockCreditTransactions.set(txRecord.id, txRecord);

  return {
    account: {
      ...account,
      available_credit: calcAvailableCredit(account)
    },
    transaction: txRecord
  };
};

/**
 * 6. Record Repayment (Credit Transaction)
 */
const recordRepayment = async ({ userId, amount, paymentMethod = 'CASH', referenceId = '', notes = '', createdBy = 'ADMIN' }) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError('Repayment amount must be positive', HTTP_STATUS.BAD_REQUEST);
  }

  const account = await getCreditAccount(userId);
  const currentOutstanding = account.outstanding_balance;

  if (currentOutstanding <= 0) {
    throw new AppError('Customer has no outstanding credit balance to repay', HTTP_STATUS.BAD_REQUEST);
  }

  if (numAmount > currentOutstanding) {
    throw new AppError(`Repayment amount (₹${numAmount}) exceeds outstanding balance (₹${currentOutstanding})`, HTTP_STATUS.BAD_REQUEST);
  }

  const newBalance = Math.round((currentOutstanding - numAmount) * 100) / 100;
  account.outstanding_balance = newBalance;
  account.updated_at = new Date().toISOString();

  const txRecord = {
    id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    credit_account_id: account.id,
    user_id: userId,
    amount: Math.round(numAmount * 100) / 100,
    transaction_type: 'CREDIT_REPAYMENT',
    reference_id: referenceId,
    notes: notes || `Khata Repayment via ${paymentMethod}`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      if (isUuid(account.id)) {
        await supabase.from('customer_store_credit').update({
          outstanding_balance: newBalance,
          updated_at: account.updated_at
        }).eq('id', account.id);
      }

      const { data: savedTx } = await supabase.from('store_credit_transactions').insert([{
        credit_account_id: isUuid(account.id) ? account.id : null,
        user_id: isUuid(userId) ? userId : null,
        amount: txRecord.amount,
        transaction_type: txRecord.transaction_type,
        reference_id: txRecord.reference_id,
        notes: txRecord.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (savedTx) txRecord.id = savedTx.id;
    } catch (e) {}
  }

  mockCreditAccounts.set(userId, account);
  mockCreditTransactions.set(txRecord.id, txRecord);

  // Record Financial Ledger Entry (Receivable Collection)
  await financialLedgerService.recordLedgerEntry({
    entryType: 'STORE_CREDIT_REPAYMENT',
    referenceType: 'REPAYMENT',
    referenceId: txRecord.id,
    amount: txRecord.amount,
    direction: 'DEBIT',
    paymentMethod: paymentMethod.toUpperCase(),
    description: `Khata Repayment: Customer ${userId}`,
    createdBy
  });

  return {
    account: {
      ...account,
      available_credit: calcAvailableCredit(account)
    },
    transaction: txRecord
  };
};

/**
 * 7. Get Customer Statement
 */
const getStatement = async (userId, queryParams = {}) => {
  const account = await getCreditAccount(userId);
  let txList = Array.from(mockCreditTransactions.values()).filter(t => t.user_id === userId || t.credit_account_id === account.id);

  if (supabase && isUuid(userId)) {
    try {
      const { data, error } = await supabase
        .from('store_credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        txList = data;
      }
    } catch (e) {}
  }

  txList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPurchases = txList
    .filter(t => t.transaction_type === 'DEBIT_PURCHASE')
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  const totalRepayments = txList
    .filter(t => t.transaction_type === 'CREDIT_REPAYMENT')
    .reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

  return {
    account,
    summary: {
      creditLimit: account.credit_limit,
      outstandingBalance: account.outstanding_balance,
      availableCredit: calcAvailableCredit(account),
      totalPurchases: Math.round(totalPurchases * 100) / 100,
      totalRepayments: Math.round(totalRepayments * 100) / 100
    },
    transactions: txList
  };
};

/**
 * 8. List All Khata Accounts (Admin)
 */
const listKhataAccounts = async (queryParams = {}) => {
  let list = Array.from(mockCreditAccounts.values());

  if (supabase) {
    try {
      let query = supabase.from('customer_store_credit').select('*, users(full_name, phone_number, email)');
      if (queryParams.status) query = query.eq('status', queryParams.status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.status) {
    list = list.filter(a => a.status === queryParams.status);
  }

  const enriched = list.map(account => ({
    ...account,
    credit_limit: parseFloat(account.credit_limit || 0),
    outstanding_balance: parseFloat(account.outstanding_balance || 0),
    available_credit: calcAvailableCredit(account)
  }));

  const totalOutstanding = enriched.reduce((acc, a) => acc + a.outstanding_balance, 0);

  return {
    accounts: enriched,
    summary: {
      totalAccounts: enriched.length,
      activeAccounts: enriched.filter(a => a.status === 'ACTIVE').length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100
    }
  };
};

/**
 * 9. Generate WhatsApp Payment Reminder Click-to-Chat URL
 */
const generatePaymentReminderPayload = async (userId) => {
  const account = await getCreditAccount(userId);

  if (account.outstanding_balance <= 0) {
    throw new AppError('Customer has zero outstanding balance. No reminder needed.', HTTP_STATUS.BAD_REQUEST);
  }

  let phone = '+917897837095';
  let name = 'Valued Customer';

  if (supabase && isUuid(userId)) {
    try {
      const { data } = await supabase.from('users').select('full_name, phone_number').eq('id', userId).maybeSingle();
      if (data) {
        if (data.full_name) name = data.full_name;
        if (data.phone_number) phone = data.phone_number;
      }
    } catch (e) {}
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const message = `🧾 *CHAUDHARY KIRANA STORE*\n\n*Udhar Payment Reminder*\n\nHello *${name}*,\nYour outstanding store credit balance is *₹${account.outstanding_balance}* (Credit Limit: ₹${account.credit_limit}).\n\nPlease visit the store or contact us to settle your payment.\n\nThank you!\nChaudhary Kirana Store`;

  const clickToChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return {
    customerName: name,
    phoneNumber: phone,
    outstandingBalance: account.outstanding_balance,
    creditLimit: account.credit_limit,
    availableCredit: calcAvailableCredit(account),
    messageText: message,
    clickToChatUrl
  };
};

module.exports = {
  getCreditAccount,
  setCreditAccount,
  updateCreditLimit,
  suspendCreditAccount,
  createCreditPurchase,
  recordRepayment,
  getStatement,
  listKhataAccounts,
  generatePaymentReminderPayload,
  mockCreditAccounts,
  mockCreditTransactions
};
