const storeCreditService = require('../../services/customer/storeCredit.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAccount = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const account = await storeCreditService.getCreditAccount(userId);
    res.status(HTTP_STATUS.OK).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
};

const getStatement = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const statement = await storeCreditService.getStatement(userId, req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: statement });
  } catch (err) {
    next(err);
  }
};

const recordRepayment = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const result = await storeCreditService.recordRepayment({
      userId,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod || 'UPI',
      referenceId: req.body.referenceId || '',
      notes: req.body.notes || 'Customer online repayment',
      createdBy: userId
    });
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Repayment recorded successfully', data: result });
  } catch (err) {
    next(err);
  }
};

// Admin Endpoints
const listAdminCreditAccounts = async (req, res, next) => {
  try {
    const result = await storeCreditService.listKhataAccounts(req.query);
    res.status(HTTP_STATUS.OK).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const updateAdminCreditLimit = async (req, res, next) => {
  try {
    const updatedBy = req.user.id || 'ADMIN';
    const account = await storeCreditService.updateCreditLimit(req.params.id, req.body.creditLimit, updatedBy);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Credit limit updated successfully', data: account });
  } catch (err) {
    next(err);
  }
};

const suspendAdminCredit = async (req, res, next) => {
  try {
    const suspendedBy = req.user.id || 'ADMIN';
    const account = await storeCreditService.suspendCreditAccount(req.params.id, suspendedBy);
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Credit account suspended', data: account });
  } catch (err) {
    next(err);
  }
};

const recordAdminRepayment = async (req, res, next) => {
  try {
    const adminId = req.user.id || 'ADMIN';
    const result = await storeCreditService.recordRepayment({
      userId: req.params.id,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod || 'CASH',
      referenceId: req.body.referenceId || '',
      notes: req.body.notes || 'Admin collected repayment',
      createdBy: adminId
    });
    res.status(HTTP_STATUS.OK).json({ success: true, message: 'Repayment recorded successfully', data: result });
  } catch (err) {
    next(err);
  }
};

const getReminderPayload = async (req, res, next) => {
  try {
    const payload = await storeCreditService.generatePaymentReminderPayload(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAccount,
  getStatement,
  recordRepayment,
  listAdminCreditAccounts,
  updateAdminCreditLimit,
  suspendAdminCredit,
  recordAdminRepayment,
  getReminderPayload
};
