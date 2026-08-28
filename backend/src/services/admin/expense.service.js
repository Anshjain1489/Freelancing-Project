const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const financialLedgerService = require('./financialLedger.service');

const mockExpenseCategories = new Map([
  ['cat-exp-rent', { id: 'cat-exp-rent', name: 'Shop Rent', description: 'Monthly commercial store lease & rent', is_active: true }],
  ['cat-exp-electricity', { id: 'cat-exp-electricity', name: 'Electricity', description: 'Power bill and electric energy costs', is_active: true }],
  ['cat-exp-salary', { id: 'cat-exp-salary', name: 'Employee Salary', description: 'Staff wages, bonuses, and salary payments', is_active: true }],
  ['cat-exp-delivery', { id: 'cat-exp-delivery', name: 'Delivery Expenses', description: 'Fleet fuel, partner payouts, and delivery costs', is_active: true }],
  ['cat-exp-misc', { id: 'cat-exp-misc', name: 'Miscellaneous', description: 'General unclassified operational expenses', is_active: true }]
]);

const mockExpenses = new Map();
const mockRecurringExpenses = new Map();
const mockProcessedRecurringPeriods = new Set();
let lastExpenseSeq = 0;

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Generate sequential expense number (EXP-YYYY-000001)
 */
const generateExpenseNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  let nextSeq = lastExpenseSeq + 1;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('expenses')
        .select('expense_number')
        .ilike('expense_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumStr = data[0].expense_number.replace(prefix, '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {}
  }

  lastExpenseSeq = nextSeq;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

/**
 * 1. Category Management
 */
const getExpenseCategories = async () => {
  let list = Array.from(mockExpenseCategories.values());

  if (supabase) {
    try {
      const { data, error } = await supabase.from('expense_categories').select('*').order('name');
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  return list;
};

const createExpenseCategory = async (categoryData) => {
  if (!categoryData.name || !categoryData.name.trim()) {
    throw new AppError('Category name is required', HTTP_STATUS.BAD_REQUEST);
  }

  const name = categoryData.name.trim();
  const existing = Array.from(mockExpenseCategories.values()).find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    throw new AppError(`Expense category "${name}" already exists`, HTTP_STATUS.CONFLICT);
  }

  const record = {
    id: `cat-exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    description: categoryData.description || '',
    is_active: categoryData.isActive !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data } = await supabase.from('expense_categories').insert([{
        name: record.name,
        description: record.description,
        is_active: record.is_active
      }]).select().single();
      if (data) {
        mockExpenseCategories.set(data.id, data);
        return data;
      }
    } catch (e) {}
  }

  mockExpenseCategories.set(record.id, record);
  return record;
};

/**
 * 2. Create Expense
 */
const createExpense = async (expenseData, createdBy = 'SYSTEM') => {
  const {
    categoryId,
    amount,
    paymentMethod = 'CASH',
    expenseDate = new Date().toISOString().split('T')[0],
    description,
    vendorName = '',
    referenceNumber = '',
    receiptUrl = '',
    autoApprove = false
  } = expenseData;

  if (!categoryId) {
    throw new AppError('Expense category ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError('Expense amount must be a positive number', HTTP_STATUS.BAD_REQUEST);
  }
  if (!description || !description.trim()) {
    throw new AppError('Expense description is required', HTTP_STATUS.BAD_REQUEST);
  }

  const validMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'];
  if (!validMethods.includes(paymentMethod.toUpperCase())) {
    throw new AppError(`Invalid payment method "${paymentMethod}". Allowed: CASH, UPI, CARD, BANK_TRANSFER`, HTTP_STATUS.BAD_REQUEST);
  }

  const expenseNumber = await generateExpenseNumber();
  const initialStatus = autoApprove ? 'APPROVED' : 'PENDING';

  const record = {
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    expense_number: expenseNumber,
    category_id: categoryId,
    amount: Math.round(numAmount * 100) / 100,
    payment_method: paymentMethod.toUpperCase(),
    expense_date: expenseDate,
    description: description.trim(),
    vendor_name: vendorName,
    reference_number: referenceNumber,
    receipt_url: receiptUrl,
    status: initialStatus,
    created_by: createdBy,
    approved_by: autoApprove ? createdBy : null,
    approved_at: autoApprove ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data } = await supabase.from('expenses').insert([{
        expense_number: record.expense_number,
        category_id: isUuid(categoryId) ? categoryId : null,
        amount: record.amount,
        payment_method: record.payment_method,
        expense_date: record.expense_date,
        description: record.description,
        vendor_name: record.vendor_name,
        reference_number: record.reference_number,
        receipt_url: record.receipt_url,
        status: record.status,
        created_by: isUuid(createdBy) ? createdBy : null,
        approved_by: autoApprove && isUuid(createdBy) ? createdBy : null,
        approved_at: record.approved_at
      }]).select().single();
      if (data) {
        record.id = data.id;
      }
    } catch (e) {}
  }

  mockExpenses.set(record.id, record);

  // If auto-approved, post financial ledger entry
  if (autoApprove) {
    await financialLedgerService.recordLedgerEntry({
      entryType: 'EXPENSE',
      referenceType: 'EXPENSE',
      referenceId: record.id,
      amount: record.amount,
      direction: 'DEBIT',
      paymentMethod: record.payment_method,
      description: `Expense: ${record.description}`,
      createdBy
    });
  }

  return record;
};

/**
 * 3. Approve Expense
 */
const approveExpense = async (expenseId, approvedBy = 'ADMIN') => {
  let expense = mockExpenses.get(expenseId);
  if (supabase && (!expense || isUuid(expenseId))) {
    try {
      const { data } = await supabase.from('expenses').select('*').eq('id', expenseId).maybeSingle();
      if (data) expense = data;
    } catch (e) {}
  }

  if (!expense) {
    throw new AppError('Expense record not found', HTTP_STATUS.NOT_FOUND);
  }
  if (expense.status !== 'PENDING') {
    throw new AppError(`Cannot approve expense in "${expense.status}" status. Only PENDING expenses can be approved.`, HTTP_STATUS.BAD_REQUEST);
  }

  expense.status = 'APPROVED';
  expense.approved_by = approvedBy;
  expense.approved_at = new Date().toISOString();
  expense.updated_at = new Date().toISOString();

  if (supabase && isUuid(expenseId)) {
    try {
      await supabase.from('expenses').update({
        status: 'APPROVED',
        approved_by: isUuid(approvedBy) ? approvedBy : null,
        approved_at: expense.approved_at,
        updated_at: expense.updated_at
      }).eq('id', expenseId);
    } catch (e) {}
  }

  mockExpenses.set(expense.id, expense);

  // Record Financial Ledger Entry upon approval
  await financialLedgerService.recordLedgerEntry({
    entryType: 'EXPENSE',
    referenceType: 'EXPENSE',
    referenceId: expense.id,
    amount: expense.amount,
    direction: 'DEBIT',
    paymentMethod: expense.payment_method,
    description: `Expense Approved: ${expense.description}`,
    createdBy: approvedBy
  });

  return expense;
};

/**
 * 4. Reject Expense
 */
const rejectExpense = async (expenseId, rejectedBy = 'ADMIN', reason = '') => {
  let expense = mockExpenses.get(expenseId);
  if (supabase && (!expense || isUuid(expenseId))) {
    try {
      const { data } = await supabase.from('expenses').select('*').eq('id', expenseId).maybeSingle();
      if (data) expense = data;
    } catch (e) {}
  }

  if (!expense) {
    throw new AppError('Expense record not found', HTTP_STATUS.NOT_FOUND);
  }
  if (expense.status !== 'PENDING') {
    throw new AppError(`Cannot reject expense in "${expense.status}" status.`, HTTP_STATUS.BAD_REQUEST);
  }

  expense.status = 'REJECTED';
  expense.reversal_reason = reason;
  expense.updated_at = new Date().toISOString();

  if (supabase && isUuid(expenseId)) {
    try {
      await supabase.from('expenses').update({
        status: 'REJECTED',
        reversal_reason: reason,
        updated_at: expense.updated_at
      }).eq('id', expenseId);
    } catch (e) {}
  }

  mockExpenses.set(expense.id, expense);
  return expense;
};

/**
 * 5. Reverse Expense (Audit-safe Compensating Reversal)
 */
const reverseExpense = async (expenseId, reversedBy = 'ADMIN', reversalReason = 'Correction') => {
  if (!reversalReason || !reversalReason.trim()) {
    throw new AppError('Reversal reason is required', HTTP_STATUS.BAD_REQUEST);
  }

  let original = mockExpenses.get(expenseId);
  if (supabase && (!original || isUuid(expenseId))) {
    try {
      const { data } = await supabase.from('expenses').select('*').eq('id', expenseId).maybeSingle();
      if (data) original = data;
    } catch (e) {}
  }

  if (!original) {
    throw new AppError('Expense record not found for reversal', HTTP_STATUS.NOT_FOUND);
  }
  if (original.status !== 'APPROVED') {
    throw new AppError(`Only APPROVED expenses can be reversed. Current status: ${original.status}`, HTTP_STATUS.BAD_REQUEST);
  }

  // Create compensating expense reversal record
  const reversalNumber = await generateExpenseNumber();
  const reversalRecord = {
    id: `exp-rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    expense_number: reversalNumber,
    category_id: original.category_id,
    amount: original.amount,
    payment_method: original.payment_method,
    expense_date: new Date().toISOString().split('T')[0],
    description: `REVERSAL of ${original.expense_number}: ${reversalReason}`,
    vendor_name: original.vendor_name,
    reference_number: original.reference_number,
    status: 'REVERSED',
    reverses_expense_id: original.id,
    reversed_by: reversedBy,
    reversal_reason: reversalReason,
    created_by: reversedBy,
    approved_by: reversedBy,
    approved_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  original.status = 'REVERSED';
  original.reversed_by = reversedBy;
  original.reversal_reason = reversalReason;
  original.updated_at = new Date().toISOString();

  if (supabase && isUuid(expenseId)) {
    try {
      await supabase.from('expenses').update({
        status: 'REVERSED',
        reversed_by: isUuid(reversedBy) ? reversedBy : null,
        reversal_reason: reversalReason,
        updated_at: original.updated_at
      }).eq('id', expenseId);
    } catch (e) {}
  }

  mockExpenses.set(original.id, original);
  mockExpenses.set(reversalRecord.id, reversalRecord);

  // Post compensating ledger entry (CREDIT: EXPENSE)
  await financialLedgerService.recordLedgerEntry({
    entryType: 'EXPENSE',
    referenceType: 'EXPENSE',
    referenceId: reversalRecord.id,
    amount: original.amount,
    direction: 'CREDIT',
    paymentMethod: original.payment_method,
    description: `Expense Reversal: ${original.expense_number} - ${reversalReason}`,
    reversesEntryId: original.id,
    reversalReason,
    createdBy: reversedBy
  });

  return { original, reversal: reversalRecord };
};

/**
 * 6. Get Expenses with Filters & Summaries
 */
const getExpenses = async (queryParams = {}) => {
  let list = Array.from(mockExpenses.values());

  if (supabase) {
    try {
      let query = supabase.from('expenses').select('*, expense_categories(name)');
      if (queryParams.status) query = query.eq('status', queryParams.status);
      if (queryParams.categoryId) query = query.eq('category_id', queryParams.categoryId);
      if (queryParams.startDate) query = query.gte('expense_date', queryParams.startDate);
      if (queryParams.endDate) query = query.lte('expense_date', queryParams.endDate);
      const { data, error } = await query.order('expense_date', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.status) {
    list = list.filter(e => e.status === queryParams.status);
  }
  if (queryParams.categoryId) {
    list = list.filter(e => String(e.category_id) === String(queryParams.categoryId));
  }
  if (queryParams.startDate) {
    list = list.filter(e => e.expense_date >= queryParams.startDate);
  }
  if (queryParams.endDate) {
    list = list.filter(e => e.expense_date <= queryParams.endDate);
  }

  const page = parseInt(queryParams.page || 1, 10);
  const limit = parseInt(queryParams.limit || 50, 10);
  const total = list.length;
  const paginated = list.slice((page - 1) * limit, page * limit);

  // Summary Metrics (ONLY APPROVED expenses affect financial total operating expenses)
  const approvedList = list.filter(e => e.status === 'APPROVED');
  const totalOperatingExpenses = approvedList.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

  // Expense breakdown by category
  const categoryMap = new Map();
  approvedList.forEach(e => {
    const catId = e.category_id || 'unassigned';
    const current = categoryMap.get(catId) || 0;
    categoryMap.set(catId, current + parseFloat(e.amount || 0));
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([catId, amount]) => {
    const catObj = mockExpenseCategories.get(catId);
    return {
      categoryId: catId,
      categoryName: catObj ? catObj.name : 'General Expense',
      amount: Math.round(amount * 100) / 100
    };
  });

  return {
    expenses: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      totalExpensesCount: list.length,
      approvedExpensesCount: approvedList.length,
      totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
      categoryBreakdown
    }
  };
};

/**
 * 7. Recurring Expense Management & Idempotent Generation
 */
const createRecurringExpense = async (data) => {
  const { title, categoryId, amount, paymentMethod = 'CASH', frequency = 'MONTHLY', nextDueDate, vendorName = '' } = data;
  if (!title || !title.trim()) throw new AppError('Title is required for recurring expense', HTTP_STATUS.BAD_REQUEST);
  if (!categoryId) throw new AppError('Category ID is required', HTTP_STATUS.BAD_REQUEST);

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) throw new AppError('Amount must be positive', HTTP_STATUS.BAD_REQUEST);

  const record = {
    id: `rec-exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: title.trim(),
    category_id: categoryId,
    amount: Math.round(numAmount * 100) / 100,
    payment_method: paymentMethod.toUpperCase(),
    frequency: frequency.toUpperCase(),
    next_due_date: nextDueDate || new Date().toISOString().split('T')[0],
    vendor_name: vendorName,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockRecurringExpenses.set(record.id, record);
  return record;
};

/**
 * Idempotent Process Recurring Expenses
 */
const processRecurringExpenses = async (createdBy = 'SYSTEM_JOB') => {
  const todayStr = new Date().toISOString().split('T')[0];
  const dueItems = Array.from(mockRecurringExpenses.values()).filter(r => r.is_active && r.next_due_date <= todayStr);
  const createdExpenses = [];

  for (const item of dueItems) {
    const periodKey = `${item.id}_${item.next_due_date}`;

    // Idempotency Guard: prevent duplicate generation if job runs twice
    if (mockProcessedRecurringPeriods.has(periodKey)) {
      continue;
    }

    const exp = await createExpense({
      categoryId: item.category_id,
      amount: item.amount,
      paymentMethod: item.payment_method,
      expenseDate: item.next_due_date,
      description: `Recurring Expense: ${item.title}`,
      vendorName: item.vendor_name,
      autoApprove: true
    }, createdBy);

    mockProcessedRecurringPeriods.add(periodKey);
    createdExpenses.push(exp);

    // Advance next_due_date based on frequency
    const nextDate = new Date(item.next_due_date);
    if (item.frequency === 'DAILY') nextDate.setDate(nextDate.getDate() + 1);
    else if (item.frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
    else if (item.frequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (item.frequency === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + 1);

    item.next_due_date = nextDate.toISOString().split('T')[0];
    item.updated_at = new Date().toISOString();
  }

  return {
    processedCount: createdExpenses.length,
    generatedExpenses: createdExpenses
  };
};

module.exports = {
  getExpenseCategories,
  createExpenseCategory,
  createExpense,
  approveExpense,
  rejectExpense,
  reverseExpense,
  getExpenses,
  createRecurringExpense,
  processRecurringExpenses,
  mockExpenseCategories,
  mockExpenses,
  mockRecurringExpenses,
  mockProcessedRecurringPeriods
};
