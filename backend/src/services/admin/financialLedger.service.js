const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const mockLedgerEntries = new Map();
let lastLedgerSeq = 0;

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Generate sequential ledger entry number (FLE-YYYY-000001)
 */
const generateEntryNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `FLE-${year}-`;
  let nextSeq = lastLedgerSeq + 1;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('financial_ledger_entries')
        .select('entry_number')
        .ilike('entry_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumStr = data[0].entry_number.replace(prefix, '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {}
  }

  lastLedgerSeq = nextSeq;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

/**
 * Record an append-only financial ledger entry
 */
const recordLedgerEntry = async (entryData) => {
  const {
    entryType,
    referenceType,
    referenceId,
    amount,
    direction,
    paymentMethod = 'CASH',
    description,
    createdBy = 'SYSTEM'
  } = entryData;

  const validTypes = ['SALE', 'REFUND', 'EXPENSE', 'SUPPLIER_PAYMENT', 'INVENTORY_WRITE_OFF', 'CASH_ADJUSTMENT', 'PAYMENT_RECEIVED', 'STORE_CREDIT_REPAYMENT', 'STORE_CREDIT_PURCHASE'];
  if (!validTypes.includes(entryType)) {
    throw new AppError(`Invalid ledger entry type "${entryType}"`, HTTP_STATUS.BAD_REQUEST);
  }

  const validDirections = ['CREDIT', 'DEBIT'];
  if (!validDirections.includes(direction)) {
    throw new AppError(`Invalid ledger direction "${direction}". Allowed: CREDIT, DEBIT`, HTTP_STATUS.BAD_REQUEST);
  }

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount < 0) {
    throw new AppError('Ledger entry amount must be a non-negative number', HTTP_STATUS.BAD_REQUEST);
  }

  const entryNumber = await generateEntryNumber();
  const record = {
    id: `fle-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    entry_number: entryNumber,
    entry_date: new Date().toISOString(),
    entry_type: entryType,
    reference_type: referenceType,
    reference_id: String(referenceId),
    amount: Math.round(numAmount * 100) / 100,
    direction,
    payment_method: paymentMethod,
    description: description || `${entryType} record`,
    reverses_entry_id: entryData.reversesEntryId || null,
    reversed_by: entryData.reversedBy || null,
    reversal_reason: entryData.reversalReason || null,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('financial_ledger_entries')
        .insert([{
          entry_number: record.entry_number,
          entry_type: record.entry_type,
          reference_type: record.reference_type,
          reference_id: record.reference_id,
          amount: record.amount,
          direction: record.direction,
          payment_method: record.payment_method,
          description: record.description,
          reverses_entry_id: isUuid(record.reverses_entry_id) ? record.reverses_entry_id : null,
          reversed_by: isUuid(record.reversed_by) ? record.reversed_by : null,
          reversal_reason: record.reversal_reason,
          created_by: isUuid(record.created_by) ? record.created_by : null
        }])
        .select()
        .single();

      if (!error && data) {
        mockLedgerEntries.set(data.id, data);
        return data;
      }
    } catch (e) {}
  }

  mockLedgerEntries.set(record.id, record);
  return record;
};

/**
 * Perform compensating reversal of a ledger entry (Append-only)
 */
const reverseLedgerEntry = async (targetEntryId, reversalReason, createdBy = 'SYSTEM') => {
  if (!targetEntryId) {
    throw new AppError('Target ledger entry ID is required for reversal', HTTP_STATUS.BAD_REQUEST);
  }
  if (!reversalReason || !reversalReason.trim()) {
    throw new AppError('Reversal reason is required', HTTP_STATUS.BAD_REQUEST);
  }

  let original = mockLedgerEntries.get(targetEntryId);
  if (supabase && (!original || isUuid(targetEntryId))) {
    try {
      const { data } = await supabase
        .from('financial_ledger_entries')
        .select('*')
        .eq('id', targetEntryId)
        .maybeSingle();
      if (data) original = data;
    } catch (e) {}
  }

  if (!original) {
    throw new AppError('Original ledger entry not found for reversal', HTTP_STATUS.NOT_FOUND);
  }

  const oppositeDirection = original.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';

  const reversal = await recordLedgerEntry({
    entryType: original.entry_type,
    referenceType: original.reference_type,
    referenceId: original.reference_id,
    amount: original.amount,
    direction: oppositeDirection,
    paymentMethod: original.payment_method,
    description: `REVERSAL: ${original.description} (${reversalReason})`,
    reversesEntryId: original.id,
    reversalReason,
    createdBy
  });

  return reversal;
};

/**
 * List ledger entries with filters & pagination
 */
const getLedgerEntries = async (queryParams = {}) => {
  let list = Array.from(mockLedgerEntries.values());

  if (supabase) {
    try {
      let query = supabase.from('financial_ledger_entries').select('*');
      if (queryParams.entryType) query = query.eq('entry_type', queryParams.entryType);
      if (queryParams.direction) query = query.eq('direction', queryParams.direction);
      if (queryParams.startDate) query = query.gte('entry_date', queryParams.startDate);
      if (queryParams.endDate) query = query.lte('entry_date', queryParams.endDate);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.entryType) {
    list = list.filter(e => e.entry_type === queryParams.entryType);
  }
  if (queryParams.direction) {
    list = list.filter(e => e.direction === queryParams.direction);
  }
  if (queryParams.startDate) {
    list = list.filter(e => new Date(e.entry_date) >= new Date(queryParams.startDate));
  }
  if (queryParams.endDate) {
    list = list.filter(e => new Date(e.entry_date) <= new Date(queryParams.endDate));
  }

  const page = parseInt(queryParams.page || 1, 10);
  const limit = parseInt(queryParams.limit || 50, 10);
  const total = list.length;
  const paginated = list.slice((page - 1) * limit, page * limit);

  // Compute Totals
  const totalCredit = list.filter(e => e.direction === 'CREDIT').reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
  const totalDebit = list.filter(e => e.direction === 'DEBIT').reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);

  return {
    entries: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      totalCredit: Math.round(totalCredit * 100) / 100,
      totalDebit: Math.round(totalDebit * 100) / 100,
      netBalance: Math.round((totalCredit - totalDebit) * 100) / 100
    }
  };
};

module.exports = {
  recordLedgerEntry,
  reverseLedgerEntry,
  getLedgerEntries,
  mockLedgerEntries
};
