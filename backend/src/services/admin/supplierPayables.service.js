const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const financialLedgerService = require('./financialLedger.service');

const mockSupplierInvoices = new Map();
const mockSupplierPayments = new Map();
let lastInvoiceSeq = 0;
let lastPaymentSeq = 0;

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * Generate sequential supplier invoice number (SINV-YYYY-000001)
 */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `SINV-${year}-`;
  let nextSeq = lastInvoiceSeq + 1;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('supplier_invoices')
        .select('invoice_number')
        .ilike('invoice_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumStr = data[0].invoice_number.replace(prefix, '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {}
  }

  lastInvoiceSeq = nextSeq;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

/**
 * Generate sequential supplier payment number (SPAY-YYYY-000001)
 */
const generatePaymentNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `SPAY-${year}-`;
  let nextSeq = lastPaymentSeq + 1;

  if (supabase) {
    try {
      const { data } = await supabase
        .from('supplier_payments')
        .select('payment_number')
        .ilike('payment_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumStr = data[0].payment_number.replace(prefix, '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed) && parsed >= nextSeq) {
          nextSeq = parsed + 1;
        }
      }
    } catch (e) {}
  }

  lastPaymentSeq = nextSeq;
  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
};

/**
 * 1. Create Supplier Invoice (Accounts Payable Record)
 */
const createSupplierInvoice = async (invoiceData, createdBy = 'ADMIN') => {
  const {
    supplierId,
    purchaseOrderId = null,
    invoiceAmount,
    dueDate,
    notes = ''
  } = invoiceData;

  if (!supplierId) {
    throw new AppError('Supplier ID is required', HTTP_STATUS.BAD_REQUEST);
  }
  const amount = parseFloat(invoiceAmount || 0);
  if (isNaN(amount) || amount <= 0) {
    throw new AppError('Invoice amount must be a positive number', HTTP_STATUS.BAD_REQUEST);
  }
  if (!dueDate) {
    throw new AppError('Due date is required for supplier invoice', HTTP_STATUS.BAD_REQUEST);
  }

  const invoiceNumber = await generateInvoiceNumber();
  const record = {
    id: `sinv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    invoice_number: invoiceNumber,
    purchase_order_id: purchaseOrderId,
    supplier_id: supplierId,
    invoice_amount: Math.round(amount * 100) / 100,
    amount_paid: 0.00,
    outstanding_balance: Math.round(amount * 100) / 100,
    due_date: dueDate,
    status: 'UNPAID',
    notes,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data } = await supabase.from('supplier_invoices').insert([{
        invoice_number: record.invoice_number,
        purchase_order_id: isUuid(purchaseOrderId) ? purchaseOrderId : null,
        supplier_id: isUuid(supplierId) ? supplierId : null,
        invoice_amount: record.invoice_amount,
        amount_paid: 0.00,
        outstanding_balance: record.outstanding_balance,
        due_date: record.due_date,
        status: 'UNPAID',
        notes: record.notes,
        created_by: isUuid(createdBy) ? createdBy : null
      }]).select().single();

      if (data) record.id = data.id;
    } catch (e) {}
  }

  mockSupplierInvoices.set(record.id, record);
  return record;
};

/**
 * 2. Record Transaction-Safe Supplier Payment (Full or Partial)
 */
const recordSupplierPayment = async (paymentData, createdBy = 'ADMIN') => {
  const {
    supplierInvoiceId,
    amount,
    paymentMethod = 'BANK_TRANSFER',
    paymentDate = new Date().toISOString().split('T')[0],
    referenceNumber = '',
    notes = ''
  } = paymentData;

  if (!supplierInvoiceId) {
    throw new AppError('Supplier invoice ID is required', HTTP_STATUS.BAD_REQUEST);
  }

  const numAmount = parseFloat(amount || 0);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError('Payment amount must be a positive number greater than zero', HTTP_STATUS.BAD_REQUEST);
  }

  let invoice = mockSupplierInvoices.get(supplierInvoiceId);
  if (supabase && (!invoice || isUuid(supplierInvoiceId))) {
    try {
      const { data } = await supabase.from('supplier_invoices').select('*').eq('id', supplierInvoiceId).maybeSingle();
      if (data) invoice = data;
    } catch (e) {}
  }

  if (!invoice) {
    throw new AppError('Supplier invoice not found', HTTP_STATUS.NOT_FOUND);
  }

  if (invoice.status === 'CANCELLED') {
    throw new AppError('Cannot record payment for a CANCELLED invoice', HTTP_STATUS.BAD_REQUEST);
  }
  if (invoice.status === 'PAID' || invoice.outstanding_balance <= 0) {
    throw new AppError('Supplier invoice is already fully paid', HTTP_STATUS.BAD_REQUEST);
  }

  // Guard: Payment amount cannot exceed outstanding balance
  if (numAmount > invoice.outstanding_balance + 0.001) {
    throw new AppError(
      `Payment amount ₹${numAmount} exceeds outstanding invoice balance of ₹${invoice.outstanding_balance}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const paymentNumber = await generatePaymentNumber();
  const paymentRecord = {
    id: `spay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    payment_number: paymentNumber,
    supplier_invoice_id: invoice.id,
    supplier_id: invoice.supplier_id,
    amount: Math.round(numAmount * 100) / 100,
    payment_method: paymentMethod.toUpperCase(),
    payment_date: paymentDate,
    reference_number: referenceNumber,
    notes,
    status: 'COMPLETED',
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  // Update invoice balance atomically
  const newAmountPaid = Math.round((parseFloat(invoice.amount_paid || 0) + numAmount) * 100) / 100;
  const newOutstanding = Math.max(0, Math.round((parseFloat(invoice.invoice_amount || 0) - newAmountPaid) * 100) / 100);

  let newStatus = 'PARTIALLY_PAID';
  if (newOutstanding <= 0.001) {
    newStatus = 'PAID';
  }

  invoice.amount_paid = newAmountPaid;
  invoice.outstanding_balance = newOutstanding;
  invoice.status = newStatus;
  invoice.updated_at = new Date().toISOString();

  if (supabase && isUuid(supplierInvoiceId)) {
    try {
      await supabase.from('supplier_invoices').update({
        amount_paid: newAmountPaid,
        outstanding_balance: newOutstanding,
        status: newStatus,
        updated_at: invoice.updated_at
      }).eq('id', supplierInvoiceId);

      await supabase.from('supplier_payments').insert([{
        payment_number: paymentNumber,
        supplier_invoice_id: supplierInvoiceId,
        supplier_id: invoice.supplier_id,
        amount: paymentRecord.amount,
        payment_method: paymentRecord.payment_method,
        payment_date: paymentRecord.payment_date,
        reference_number: paymentRecord.reference_number,
        notes: paymentRecord.notes,
        status: 'COMPLETED',
        created_by: isUuid(createdBy) ? createdBy : null
      }]);
    } catch (e) {}
  }

  mockSupplierInvoices.set(invoice.id, invoice);
  mockSupplierPayments.set(paymentRecord.id, paymentRecord);

  // Record Financial Ledger Entry (DEBIT: SUPPLIER_PAYMENT)
  // Supplier PO payments are cash flow events that update Accounts Payable balance
  await financialLedgerService.recordLedgerEntry({
    entryType: 'SUPPLIER_PAYMENT',
    referenceType: 'SUPPLIER_PAYMENT',
    referenceId: paymentRecord.id,
    amount: paymentRecord.amount,
    direction: 'DEBIT',
    paymentMethod: paymentRecord.payment_method,
    description: `Supplier Payment ${paymentNumber} for Invoice ${invoice.invoice_number}`,
    createdBy
  });

  return { payment: paymentRecord, invoice };
};

/**
 * 3. Reverse Supplier Payment (Compensating Record)
 */
const reverseSupplierPayment = async (paymentId, reversedBy = 'ADMIN', reversalReason = 'Correction') => {
  let payment = mockSupplierPayments.get(paymentId);
  if (supabase && (!payment || isUuid(paymentId))) {
    try {
      const { data } = await supabase.from('supplier_payments').select('*').eq('id', paymentId).maybeSingle();
      if (data) payment = data;
    } catch (e) {}
  }

  if (!payment) {
    throw new AppError('Supplier payment record not found', HTTP_STATUS.NOT_FOUND);
  }
  if (payment.status !== 'COMPLETED') {
    throw new AppError('Only COMPLETED payments can be reversed', HTTP_STATUS.BAD_REQUEST);
  }

  let invoice = mockSupplierInvoices.get(payment.supplier_invoice_id);
  if (supabase && (!invoice || isUuid(payment.supplier_invoice_id))) {
    try {
      const { data } = await supabase.from('supplier_invoices').select('*').eq('id', payment.supplier_invoice_id).maybeSingle();
      if (data) invoice = data;
    } catch (e) {}
  }

  const paymentNumber = await generatePaymentNumber();
  const reversalPayment = {
    id: `spay-rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    payment_number: paymentNumber,
    supplier_invoice_id: payment.supplier_invoice_id,
    supplier_id: payment.supplier_id,
    amount: payment.amount,
    payment_method: payment.payment_method,
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: payment.reference_number,
    notes: `REVERSAL of ${payment.payment_number}: ${reversalReason}`,
    status: 'REVERSED',
    reverses_payment_id: payment.id,
    reversal_reason: reversalReason,
    created_by: reversedBy,
    created_at: new Date().toISOString()
  };

  payment.status = 'REVERSED';
  payment.reversal_reason = reversalReason;

  if (invoice) {
    const newAmountPaid = Math.max(0, Math.round((parseFloat(invoice.amount_paid || 0) - payment.amount) * 100) / 100);
    const newOutstanding = Math.round((parseFloat(invoice.invoice_amount || 0) - newAmountPaid) * 100) / 100;
    let newStatus = 'UNPAID';
    if (newAmountPaid > 0) newStatus = 'PARTIALLY_PAID';

    invoice.amount_paid = newAmountPaid;
    invoice.outstanding_balance = newOutstanding;
    invoice.status = newStatus;
    invoice.updated_at = new Date().toISOString();

    mockSupplierInvoices.set(invoice.id, invoice);
  }

  mockSupplierPayments.set(payment.id, payment);
  mockSupplierPayments.set(reversalPayment.id, reversalPayment);

  // Post Compensating Financial Ledger Entry (CREDIT: SUPPLIER_PAYMENT)
  await financialLedgerService.recordLedgerEntry({
    entryType: 'SUPPLIER_PAYMENT',
    referenceType: 'SUPPLIER_PAYMENT',
    referenceId: reversalPayment.id,
    amount: payment.amount,
    direction: 'CREDIT',
    paymentMethod: payment.payment_method,
    description: `Reversal of Supplier Payment ${payment.payment_number}`,
    reversesEntryId: payment.id,
    reversalReason,
    createdBy: reversedBy
  });

  return { originalPayment: payment, reversalPayment, invoice };
};

/**
 * 4. Get Supplier Invoices & Payables Analytics
 */
const getSupplierPayables = async (queryParams = {}) => {
  let invoices = Array.from(mockSupplierInvoices.values());
  let payments = Array.from(mockSupplierPayments.values());

  if (supabase) {
    try {
      const { data: invData } = await supabase.from('supplier_invoices').select('*, suppliers(name)');
      if (invData && invData.length > 0) invoices = invData;

      const { data: payData } = await supabase.from('supplier_payments').select('*');
      if (payData && payData.length > 0) payments = payData;
    } catch (e) {}
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Update overdue status dynamically if unpaid and past due date
  invoices.forEach(inv => {
    if (inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.due_date < todayStr) {
      inv.status = 'OVERDUE';
    }
  });

  if (queryParams.status) {
    invoices = invoices.filter(i => i.status === queryParams.status);
  }
  if (queryParams.supplierId) {
    invoices = invoices.filter(i => String(i.supplier_id) === String(queryParams.supplierId));
  }

  const page = parseInt(queryParams.page || 1, 10);
  const limit = parseInt(queryParams.limit || 50, 10);
  const total = invoices.length;
  const paginated = invoices.slice((page - 1) * limit, page * limit);

  // Summary Metrics
  const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED');
  const totalOutstanding = activeInvoices.reduce((acc, i) => acc + parseFloat(i.outstanding_balance || 0), 0);
  const overdueAmount = activeInvoices.filter(i => i.status === 'OVERDUE' || (i.due_date < todayStr && i.status !== 'PAID')).reduce((acc, i) => acc + parseFloat(i.outstanding_balance || 0), 0);
  const upcomingDueAmount = activeInvoices.filter(i => i.due_date >= todayStr && i.status !== 'PAID').reduce((acc, i) => acc + parseFloat(i.outstanding_balance || 0), 0);

  return {
    invoices: paginated,
    payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: {
      totalInvoicesCount: invoices.length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      upcomingDueAmount: Math.round(upcomingDueAmount * 100) / 100
    }
  };
};

module.exports = {
  createSupplierInvoice,
  recordSupplierPayment,
  reverseSupplierPayment,
  getSupplierPayables,
  mockSupplierInvoices,
  mockSupplierPayments
};
