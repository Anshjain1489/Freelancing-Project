const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const financialLedgerService = require('./financialLedger.service');

const mockCashSessions = new Map();
const mockCashMovements = [];
const mockCashReconciliations = [];
let lastSessionSeq = 0;

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Generate sequential cash session number (CSESS-YYYY-000001)
 */
const generateSessionNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `CSESS-${year}-`;
  let nextSeq = lastSessionSeq + 1;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('cash_register_sessions')
        .select('session_number')
        .ilike('session_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumStr = data[0].session_number.replace(prefix, '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {}
  }

  lastSessionSeq = nextSeq;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

/**
 * 1. Calculate Server-Authoritative Expected Cash
 */
const calculateExpectedCash = (session) => {
  const opening = parseFloat(session.opening_cash || 0);
  const sales = parseFloat(session.cash_sales || 0);
  const cashIn = parseFloat(session.cash_in || 0);
  const expenses = parseFloat(session.cash_expenses || 0);
  const cashOut = parseFloat(session.cash_out || 0);
  const adj = parseFloat(session.manual_adjustments || 0);

  // Expected Cash = Opening + Cash Sales + Cash In + Adjustments - Cash Expenses - Cash Out
  const expected = opening + sales + cashIn + adj - expenses - cashOut;
  return Math.round(expected * 100) / 100;
};

/**
 * 2. Get Current Active Cash Session
 */
const getCurrentSession = async (registerId = 'MAIN_POS_1') => {
  let session = Array.from(mockCashSessions.values()).find(s => s.register_id === registerId && s.status === 'OPEN');

  if (supabase && !session) {
    try {
      const { data } = await supabase
        .from('cash_register_sessions')
        .select('*')
        .eq('register_id', registerId)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (data) session = data;
    } catch (e) {}
  }

  if (session) {
    session.expected_cash = calculateExpectedCash(session);
  }

  return session || null;
};

/**
 * 3. Open Cash Session (Strict Concurrency Guard)
 */
const openCashSession = async (sessionData, openedBy = 'ADMIN') => {
  const registerId = sessionData.registerId || 'MAIN_POS_1';
  const openingCash = parseFloat(sessionData.openingCash || 0);

  if (isNaN(openingCash) || openingCash < 0) {
    throw new AppError('Opening cash amount must be a non-negative number', HTTP_STATUS.BAD_REQUEST);
  }

  // Concurrency Guard: Check if active open session already exists
  const existingActive = await getCurrentSession(registerId);
  if (existingActive) {
    throw new AppError(
      `An active open cash session (${existingActive.session_number}) is already running for register "${registerId}". Close it before opening a new session.`,
      HTTP_STATUS.CONFLICT
    );
  }

  const sessionNumber = await generateSessionNumber();
  const record = {
    id: `csess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    session_number: sessionNumber,
    register_id: registerId,
    opened_by: openedBy,
    closed_by: null,
    opened_at: new Date().toISOString(),
    closed_at: null,
    opening_cash: Math.round(openingCash * 100) / 100,
    cash_sales: 0.00,
    cash_in: 0.00,
    cash_expenses: 0.00,
    cash_out: 0.00,
    manual_adjustments: 0.00,
    expected_cash: Math.round(openingCash * 100) / 100,
    actual_cash: null,
    discrepancy: 0.00,
    status: 'OPEN',
    notes: sessionData.notes || 'Day Opening Cash Register',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('cash_register_sessions').insert([{
        session_number: record.session_number,
        register_id: record.register_id,
        opened_by: isUuid(openedBy) ? openedBy : null,
        opening_cash: record.opening_cash,
        cash_sales: 0,
        cash_in: 0,
        cash_expenses: 0,
        cash_out: 0,
        manual_adjustments: 0,
        expected_cash: record.opening_cash,
        status: 'OPEN',
        notes: record.notes
      }]).select().single();

      if (error && error.code === '23505') {
        throw new AppError('An active cash session is already open for this register', HTTP_STATUS.CONFLICT);
      }
      if (data) record.id = data.id;
    } catch (e) {
      if (e instanceof AppError) throw e;
    }
  }

  mockCashSessions.set(record.id, record);

  // Post Initial Cash Entry if opening cash > 0
  if (openingCash > 0) {
    await financialLedgerService.recordLedgerEntry({
      entryType: 'CASH_ADJUSTMENT',
      referenceType: 'CASH_SESSION',
      referenceId: record.id,
      amount: openingCash,
      direction: 'CREDIT',
      paymentMethod: 'CASH',
      description: `Opening Cash Register Balance (${sessionNumber})`,
      createdBy: openedBy
    });
  }

  return record;
};

/**
 * 4. Record Cash Movement
 */
const recordCashMovement = async (movementData, createdBy = 'ADMIN') => {
  const {
    sessionId,
    movementType,
    amount,
    description,
    referenceType = null,
    referenceId = null
  } = movementData;

  const validTypes = ['CASH_IN', 'CASH_OUT', 'CASH_SALE', 'CASH_EXPENSE', 'MANUAL_ADJUSTMENT'];
  if (!validTypes.includes(movementType)) {
    throw new AppError(`Invalid cash movement type "${movementType}"`, HTTP_STATUS.BAD_REQUEST);
  }

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError('Cash movement amount must be positive', HTTP_STATUS.BAD_REQUEST);
  }

  let session = null;
  if (sessionId) {
    session = mockCashSessions.get(sessionId);
    if (supabase && (!session || isUuid(sessionId))) {
      try {
        const { data } = await supabase.from('cash_register_sessions').select('*').eq('id', sessionId).maybeSingle();
        if (data) session = data;
      } catch (e) {}
    }
  } else {
    session = await getCurrentSession();
  }

  if (!session) {
    throw new AppError('No active open cash register session found', HTTP_STATUS.NOT_FOUND);
  }
  if (session.status !== 'OPEN') {
    throw new AppError('Cannot record cash movement on a CLOSED cash session', HTTP_STATUS.BAD_REQUEST);
  }

  // Update session accumulation totals
  if (movementType === 'CASH_SALE') session.cash_sales = parseFloat(session.cash_sales || 0) + numAmount;
  else if (movementType === 'CASH_IN') session.cash_in = parseFloat(session.cash_in || 0) + numAmount;
  else if (movementType === 'CASH_EXPENSE') session.cash_expenses = parseFloat(session.cash_expenses || 0) + numAmount;
  else if (movementType === 'CASH_OUT') session.cash_out = parseFloat(session.cash_out || 0) + numAmount;
  else if (movementType === 'MANUAL_ADJUSTMENT') session.manual_adjustments = parseFloat(session.manual_adjustments || 0) + numAmount;

  session.expected_cash = calculateExpectedCash(session);
  session.updated_at = new Date().toISOString();

  const movementRecord = {
    id: `cmov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    session_id: session.id,
    movement_type: movementType,
    amount: Math.round(numAmount * 100) / 100,
    description: description || movementType,
    reference_type: referenceType,
    reference_id: referenceId ? String(referenceId) : null,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  if (supabase && isUuid(session.id)) {
    try {
      await supabase.from('cash_register_sessions').update({
        cash_sales: session.cash_sales,
        cash_in: session.cash_in,
        cash_expenses: session.cash_expenses,
        cash_out: session.cash_out,
        manual_adjustments: session.manual_adjustments,
        expected_cash: session.expected_cash,
        updated_at: session.updated_at
      }).eq('id', session.id);

      await supabase.from('cash_movements').insert([{
        session_id: session.id,
        movement_type: movementType,
        amount: movementRecord.amount,
        description: movementRecord.description,
        reference_type: referenceType,
        reference_id: referenceId ? String(referenceId) : null,
        created_by: isUuid(createdBy) ? createdBy : null
      }]);
    } catch (e) {}
  }

  mockCashSessions.set(session.id, session);
  mockCashMovements.push(movementRecord);

  return { movement: movementRecord, session };
};

/**
 * 5. Close Cash Register Session (Server-Authoritative Reconciliation)
 */
const closeCashSession = async (closeData, closedBy = 'ADMIN') => {
  const { sessionId, actualCountedCash, notes = '' } = closeData;

  const counted = parseFloat(actualCountedCash);
  if (isNaN(counted) || counted < 0) {
    throw new AppError('Actual counted cash must be a non-negative number', HTTP_STATUS.BAD_REQUEST);
  }

  let session = null;
  if (sessionId) {
    session = mockCashSessions.get(sessionId);
    if (supabase && (!session || isUuid(sessionId))) {
      try {
        const { data } = await supabase.from('cash_register_sessions').select('*').eq('id', sessionId).maybeSingle();
        if (data) session = data;
      } catch (e) {}
    }
  } else {
    session = await getCurrentSession();
  }

  if (!session) {
    throw new AppError('No active open cash session found to close', HTTP_STATUS.NOT_FOUND);
  }
  if (session.status !== 'OPEN') {
    throw new AppError('Cash session is already CLOSED', HTTP_STATUS.BAD_REQUEST);
  }

  // Server-Authoritative calculation of expected cash & discrepancy
  const expectedCash = calculateExpectedCash(session);
  const discrepancy = Math.round((counted - expectedCash) * 100) / 100;

  // Rule: Non-zero discrepancy requires notes
  if (Math.abs(discrepancy) > 0.01 && (!notes || !notes.trim())) {
    throw new AppError(
      `Cash discrepancy of ₹${discrepancy > 0 ? '+' : ''}${discrepancy} detected. Explanation notes are mandatory.`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const reconciliationStatus = Math.abs(discrepancy) <= 0.01 ? 'MATCHED' : 'DISCREPANCY_FLAGGED';

  session.actual_cash = Math.round(counted * 100) / 100;
  session.expected_cash = expectedCash;
  session.discrepancy = discrepancy;
  session.status = 'CLOSED';
  session.closed_by = closedBy;
  session.closed_at = new Date().toISOString();
  session.notes = notes ? `${session.notes || ''} | Closing notes: ${notes}` : session.notes;
  session.updated_at = new Date().toISOString();

  const reconciliationRecord = {
    id: `crec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    session_id: session.id,
    expected_cash: expectedCash,
    actual_cash: Math.round(counted * 100) / 100,
    discrepancy,
    status: reconciliationStatus,
    notes,
    reconciled_by: closedBy,
    reconciled_at: new Date().toISOString()
  };

  if (supabase && isUuid(session.id)) {
    try {
      await supabase.from('cash_register_sessions').update({
        actual_cash: session.actual_cash,
        expected_cash: session.expected_cash,
        discrepancy: session.discrepancy,
        status: 'CLOSED',
        closed_by: isUuid(closedBy) ? closedBy : null,
        closed_at: session.closed_at,
        notes: session.notes,
        updated_at: session.updated_at
      }).eq('id', session.id);

      await supabase.from('cash_reconciliations').insert([{
        session_id: session.id,
        expected_cash: expectedCash,
        actual_cash: session.actual_cash,
        discrepancy,
        status: reconciliationStatus,
        notes,
        reconciled_by: isUuid(closedBy) ? closedBy : null
      }]);
    } catch (e) {}
  }

  mockCashSessions.set(session.id, session);
  mockCashReconciliations.push(reconciliationRecord);

  // If discrepancy exists, post financial ledger entry
  if (Math.abs(discrepancy) > 0.01) {
    await financialLedgerService.recordLedgerEntry({
      entryType: 'CASH_ADJUSTMENT',
      referenceType: 'CASH_RECONCILIATION',
      referenceId: session.id,
      amount: Math.abs(discrepancy),
      direction: discrepancy > 0 ? 'CREDIT' : 'DEBIT',
      paymentMethod: 'CASH',
      description: `Cash Session Closing Discrepancy (${discrepancy > 0 ? 'Over' : 'Short'} ₹${Math.abs(discrepancy)}): ${notes}`,
      createdBy: closedBy
    });
  }

  return { session, reconciliation: reconciliationRecord };
};

/**
 * 6. Get Cash Sessions History
 */
const getCashSessionsHistory = async (queryParams = {}) => {
  let list = Array.from(mockCashSessions.values());

  if (supabase) {
    try {
      const { data } = await supabase.from('cash_register_sessions').select('*').order('opened_at', { ascending: false });
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }

  const page = parseInt(queryParams.page || 1, 10);
  const limit = parseInt(queryParams.limit || 50, 10);
  const total = list.length;
  const paginated = list.slice((page - 1) * limit, page * limit);

  return {
    sessions: paginated,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
  };
};

/**
 * 7. Get Cash Movements for Session
 */
const getCashMovements = async (sessionId = null) => {
  let list = mockCashMovements.filter(m => !sessionId || m.session_id === sessionId);
  if (supabase && sessionId && isUuid(sessionId)) {
    try {
      const { data } = await supabase.from('cash_movements').select('*').eq('session_id', sessionId);
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }
  return { movements: list };
};

module.exports = {
  calculateExpectedCash,
  getCurrentSession,
  openCashSession,
  recordCashMovement,
  closeCashSession,
  getCashSessionsHistory,
  getCashMovements,
  mockCashSessions,
  mockCashMovements,
  mockCashReconciliations
};
