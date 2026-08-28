const financialService = require('../../services/admin/financial.service');
const profitLossService = require('../../services/admin/profitLoss.service');
const supplierPayablesService = require('../../services/admin/supplierPayables.service');
const financialLedgerService = require('../../services/admin/financialLedger.service');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await financialService.getFinancialDashboard(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...dashboard });
  } catch (error) {
    next(error);
  }
};

const getProfitLoss = async (req, res, next) => {
  try {
    const statement = await profitLossService.generateProfitAndLossStatement(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...statement });
  } catch (error) {
    next(error);
  }
};

const getPayables = async (req, res, next) => {
  try {
    const payables = await supplierPayablesService.getSupplierPayables(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...payables });
  } catch (error) {
    next(error);
  }
};

const createSupplierInvoice = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const invoice = await supplierPayablesService.createSupplierInvoice(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

const recordSupplierPayment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const result = await supplierPayablesService.recordSupplierPayment(req.body, userId);
    return res.status(HTTP_STATUS.CREATED).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const reverseSupplierPayment = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'ADMIN';
    const { reason } = req.body;
    const result = await supplierPayablesService.reverseSupplierPayment(req.params.id, userId, reason);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...result, message: 'Supplier payment reversed successfully' });
  } catch (error) {
    next(error);
  }
};

const getLedger = async (req, res, next) => {
  try {
    const ledger = await financialLedgerService.getLedgerEntries(req.query);
    return res.status(HTTP_STATUS.OK).json({ success: true, ...ledger });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getProfitLoss,
  getPayables,
  createSupplierInvoice,
  recordSupplierPayment,
  reverseSupplierPayment,
  getLedger
};
